package site.lexid.yeohangnav

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.Manifest
import android.os.Build
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONArray
import java.util.UUID

/**
 * App-owned, opt-in voice/text assistant. The mic is off until tapped.
 * Voice bytes are not written to disk by this app; Android's recognizer may
 * use a provider network service, which requires separate consent.
 */
internal class NavVoiceAssistant(
    private val activity: Activity,
    private val root: FrameLayout,
    private val execute: (NavVoiceCommandEngine.Command) -> String
) {
    companion object { const val AUDIO_PERMISSION_REQUEST = 2311 }
    private val prefs = activity.getSharedPreferences("yeohang_nav_voice_v1", Context.MODE_PRIVATE)
    private var sessionId = prefs.getString("session_id", null)
        ?: UUID.randomUUID().toString().also { prefs.edit().putString("session_id", it).apply() }
    private var recognizer: SpeechRecognizer? = null
    private var listening = false
    private var disposed = false
    private lateinit var scrim: View
    private lateinit var sheet: LinearLayout
    private lateinit var input: EditText
    private lateinit var status: TextView
    private lateinit var historyText: TextView
    private lateinit var mic: Button
    private var items = loadHistory()
    private var active = false

    private fun dp(x: Int) = (x * activity.resources.displayMetrics.density + .5f).toInt()
    private fun background(color: Int, radius: Int) = GradientDrawable().apply {
        setColor(color); cornerRadius = dp(radius).toFloat()
    }
    private fun text(label: String, size: Float, color: Int, bold: Boolean = false) =
        TextView(activity).apply {
            text = label; textSize = size; setTextColor(color)
            if (bold) setTypeface(Typeface.DEFAULT, Typeface.BOLD)
        }

    init { buildUi() }

    fun isOpen() = active

    private fun buildUi() {
        scrim = View(activity).apply {
            setBackgroundColor(Color.argb(165, 0, 26, 30))
            visibility = View.GONE
            setOnClickListener { close() }
        }
        root.addView(scrim, FrameLayout.LayoutParams(-1, -1))
        sheet = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(16), dp(18), dp(18))
            background = GradientDrawable().apply {
                setColor(Color.WHITE)
                cornerRadii = floatArrayOf(dp(24).toFloat(),dp(24).toFloat(),
                    dp(24).toFloat(),dp(24).toFloat(),0f,0f,0f,0f)
            }
            visibility = View.GONE
            elevation = dp(18).toFloat()
            tag = "nav-ai-voice-sheet"
        }
        val header = LinearLayout(activity).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        header.addView(text("여행갈지도 · AI 음성 명령", 19f, Color.rgb(12,69,73), true), LinearLayout.LayoutParams(0, -2, 1f))
        header.addView(Button(activity).apply {
            text = "닫기"
            contentDescription = "AI 음성 패널 닫기"
            setOnClickListener { close() }
        })
        sheet.addView(header)
        sheet.addView(text("마이크를 누른 뒤 한국어로 말하거나 텍스트를 입력하세요.", 12f, Color.DKGRAY))
        val info = text("AI 대화: 앱 전용 세션 · ChatGPT 앱 기존 대화 가져오기 기능 아님", 11f, Color.rgb(115,84,24))
        info.setPadding(0,dp(7),0,dp(6)); sheet.addView(info)
        val scroll=ScrollView(activity)
        historyText=text("",13f,Color.rgb(29,68,70))
        historyText.setPadding(dp(12),dp(8),dp(12),dp(8))
        historyText.background=background(Color.rgb(241,247,244),12)
        scroll.addView(historyText)
        sheet.addView(scroll,LinearLayout.LayoutParams(-1,0,1f).apply { topMargin=dp(6);bottomMargin=dp(8) })
        input = EditText(activity).apply {
            hint="예: 메뉴 열어 / 서울 호텔 찾아줘 / 길안내 종료"
            contentDescription="음성 변환 텍스트 및 AI 명령어 입력"
            textSize=15f
            minLines=2
            maxLines=4
            setSingleLine(false)
            setPadding(dp(14),dp(10),dp(14),dp(10))
            background=background(Color.rgb(245,248,246),13)
        }
        sheet.addView(input, LinearLayout.LayoutParams(-1,-2))
        status=text("대기 중 · 녹음되지 않고 있습니다",12f,Color.rgb(64,98,100))
        status.setPadding(0,dp(7),0,dp(6))
        sheet.addView(status)
        val row=LinearLayout(activity).apply { orientation=LinearLayout.HORIZONTAL }
        mic=Button(activity).apply {
            text="🎙 마이크"
            contentDescription="녹음 시작 또는 중지"
            setOnClickListener { if(listening) stopListening() else beginListening() }
        }
        row.addView(mic,LinearLayout.LayoutParams(0,dp(52),1f))
        row.addView(Button(activity).apply {
            text="명령 실행"
            contentDescription="인식된 텍스트의 기기 명령 실행"
            setOnClickListener { executeLocal() }
        },LinearLayout.LayoutParams(0,dp(52),1f))
        sheet.addView(row)
        sheet.addView(Button(activity).apply {
            text="ChatGPT AI 질문 보내기"
            contentDescription="로그인된 계정의 앱 전용 AI 세션에 텍스트 보내기"
            setOnClickListener { sendToAi() }
        }, LinearLayout.LayoutParams(-1,dp(54)))
        sheet.addView(Button(activity).apply {
            text="연결된 AI 세션 불러오기"
            contentDescription="내 계정의 이전 여행갈지도 AI 대화 세션 목록"
            setOnClickListener { loadCloudSessions() }
        },LinearLayout.LayoutParams(-1,dp(47)))
        val actions=LinearLayout(activity).apply { orientation=LinearLayout.HORIZONTAL }
        actions.addView(Button(activity).apply {
            text="웹 로그인"
            contentDescription="여행갈지도 계정 로그인 화면 열기"
            setOnClickListener {
                close()
                activity.startActivity(Intent(activity, MainActivity::class.java))
            }
        },LinearLayout.LayoutParams(0,dp(47),1f))
        actions.addView(Button(activity).apply {
            text="새 세션·기록 삭제"
            contentDescription="로컬 음성 전환 기록 삭제 및 새로운 AI 세션 시작"
            setOnClickListener {
                AlertDialog.Builder(activity).setTitle("기록을 삭제할까요?")
                    .setMessage("이 기기 내 기록을 지우고 새로운 AI 세션 ID로 시작합니다. 서버에 남은 이전 세션은 별도 관리 대상입니다.")
                    .setNegativeButton("취소",null)
                    .setPositiveButton("삭제"){_,_->
                        items=JSONArray()
                        sessionId=UUID.randomUUID().toString()
                        prefs.edit().putString("session_id",sessionId)
                            .remove("history").apply()
                        renderHistory()
                        status.text="새로운 AI 세션을 시작했습니다."
                    }.show()
            }
        },LinearLayout.LayoutParams(0,dp(47),1f))
        sheet.addView(actions)
        root.addView(sheet, FrameLayout.LayoutParams(-1,dp(540),Gravity.BOTTOM))
        renderHistory()
    }

    fun show() {
        if(disposed) return
        active=true
        scrim.visibility=View.VISIBLE
        sheet.visibility=View.VISIBLE
        sheet.translationY=dp(530).toFloat()
        sheet.animate().translationY(0f).setDuration(220).start()
    }
    fun close() {
        if(disposed) return
        active=false
        stopAndDestroyRecognizer()
        scrim.visibility=View.GONE
        sheet.visibility=View.GONE
    }

    fun onPermissionResult() {
        if(activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED)
            beginListening()
        else status.text="마이크 권한이 거부됐습니다. 텍스트 명령은 계속 사용할 수 있습니다."
    }

    private fun beginListening() {
        if(disposed||!active||listening) return
        if(activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED) {
            activity.requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), AUDIO_PERMISSION_REQUEST)
            return
        }
        if(!SpeechRecognizer.isRecognitionAvailable(activity)) {
            status.text="음성 인식 서비스가 설치되지 않았습니다. 텍스트를 입력하세요."
            return
        }
        // Prefer on-device recognition when Android provides it.
        if(Build.VERSION.SDK_INT>=31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(activity)) {
            startRecognizer(onDevice=true)
        } else {
            AlertDialog.Builder(activity).setTitle("음성 처리 방식")
                .setMessage("이 기기는 온디바이스 음성 인식을 지원하지 않습니다. 시스템 음성인식 서비스가 발화 음성을 외부 서버로 전송할 수 있습니다. 계속하시겠습니까?")
                .setNegativeButton("취소",null)
                .setPositiveButton("동의하고 시작"){_,_->startRecognizer(onDevice=false)}
                .show()
        }
    }

    private fun startRecognizer(onDevice: Boolean) {
        stopAndDestroyRecognizer()
        try {
            recognizer = if(onDevice && Build.VERSION.SDK_INT>=31)
                SpeechRecognizer.createOnDeviceSpeechRecognizer(activity)
            else SpeechRecognizer.createSpeechRecognizer(activity)
            recognizer?.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) { status.text="듣고 있습니다 · 한국어 발화" }
                override fun onBeginningOfSpeech() { status.text="음성을 텍스트로 변환 중입니다" }
                override fun onRmsChanged(rmsdB: Float) = Unit
                override fun onBufferReceived(buffer: ByteArray?) = Unit
                override fun onEndOfSpeech() { status.text="음성 인식 결과를 기다리고 있습니다" }
                override fun onError(error: Int) {
                    listening=false; mic.text="🎙 마이크"
                    status.text="음성 인식 오류($error) · 직접 입력할 수 있습니다."
                    stopAndDestroyRecognizer()
                }
                override fun onResults(results: Bundle?) {
                    listening=false; mic.text="🎙 마이크"
                    val recognized=results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        ?.firstOrNull()?.trim().orEmpty()
                    if(recognized.isNotBlank()) {
                        input.setText(recognized)
                        input.setSelection(recognized.length)
                        status.text="변환 완료 · '명령 실행' 또는 'AI 질문'을 선택하세요."
                    } else status.text="인식된 내용이 없습니다. 다시 말해 주세요."
                    stopAndDestroyRecognizer()
                }
                override fun onPartialResults(partialResults: Bundle?) {
                    val partial=partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                    if(!partial.isNullOrBlank()) input.setText(partial)
                }
                override fun onEvent(eventType: Int, params: Bundle?) = Unit
            })
            val intent=Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE,"ko-KR")
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS,true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1)
            }
            recognizer?.startListening(intent)
            listening=true
            mic.text="■ 중지"
            status.text="마이크 켜짐 · 종료하려면 중지를 누르세요"
        } catch(e:Exception) {
            listening=false
            mic.text="🎙 마이크"
            status.text="인식 서비스를 시작할 수 없습니다. 텍스트를 이용해 주세요."
            stopAndDestroyRecognizer()
        }
    }

    private fun stopListening() {
        if(!listening)return
        recognizer?.stopListening()
        mic.text="🎙 마이크"
        status.text="녹음을 마치고 음성 변환 중입니다."
    }
    private fun stopAndDestroyRecognizer() {
        listening=false
        runCatching {recognizer?.cancel()}
        runCatching {recognizer?.destroy()}
        recognizer=null
    }

    private fun executeLocal() {
        val message=input.text.toString().trim()
        if(message.isEmpty()){status.text="명령을 입력하세요.";return}
        val command=NavVoiceCommandEngine.interpret(message)
        if(command.action==NavVoiceCommandEngine.Action.STOP_GUIDANCE) {
            AlertDialog.Builder(activity).setTitle("길안내를 종료하시겠습니까?")
                .setNegativeButton("취소",null)
                .setPositiveButton("종료"){_,_->saveTurn("나",message);saveTurn("NAV",execute(command))}
                .show()
            return
        }
        saveTurn("나",message)
        val answer=execute(command)
        saveTurn("NAV",answer)
        status.text=answer
    }

    private fun loadCloudSessions() {
        status.text="여행갈지도 계정의 AI 세션을 조회합니다."
        NavAiSessionClient.listSessions(activity) { result ->
            if (disposed) return@listSessions
            val sessions=result.getOrNull()
            if (sessions==null) {
                status.text="세션 목록을 불러올 수 없습니다. 웹 로그인과 AI 서버 배포 상태를 확인하세요."
                return@listSessions
            }
            if (sessions.isEmpty()) {
                status.text="기존 AI 세션이 없습니다. 질문을 보내면 새 세션이 만들어집니다."
                return@listSessions
            }
            val labels=sessions.map {
                (it.lastQuestion.ifBlank { "이전 대화" }.take(28)) + " · " + it.count + "개 질문"
            }.toTypedArray()
            AlertDialog.Builder(activity)
                .setTitle("여행갈지도 AI 세션 이어하기")
                .setItems(labels){_,idx->
                    val chosen=sessions[idx]
                    sessionId=chosen.id
                    items=JSONArray()
                    prefs.edit().putString("session_id",sessionId).remove("history").apply()
                    if(chosen.lastQuestion.isNotBlank()) saveTurn("나",chosen.lastQuestion)
                    if(chosen.lastAnswer.isNotBlank()) saveTurn("AI",chosen.lastAnswer)
                    renderHistory()
                    status.text="선택한 AI 세션에 연결했습니다. 다음 질문부터 대화를 이어갑니다."
                }
                .setNegativeButton("취소",null)
                .show()
        }
    }

    private fun sendToAi() {
        val message=input.text.toString().trim()
        if(message.isBlank()) {status.text="질문을 입력하세요.";return}
        if(message.length>500) {status.text="질문은 500자 이하로 입력하세요.";return}
        status.text="앱 전용 AI 세션에 질문을 전송합니다. 서버 로그인을 확인합니다."
        saveTurn("나",message)
        NavAiSessionClient.send(activity,sessionId,message){result->
            if(disposed)return@send
            val reply=result.fold(onSuccess={it},onFailure={t->
                val note=when(t.message){
                    "AUTH_REQUIRED"->"여행갈지도 웹 계정 로그인이 필요합니다. '웹 로그인'을 누르세요."
                    "AI_NOT_CONFIGURED"->"AI 서버가 아직 설정되지 않았습니다. 로컬 명령은 사용할 수 있습니다."
                    "BACKEND_NOT_DEPLOYED"->"AI 서버 기능이 아직 배포되지 않았습니다."
                    else->"AI 연결에 실패했습니다. 네트워크·서버 상태를 확인하세요."
                }
                note
            })
            saveTurn("AI",reply)
            status.text=reply
        }
    }

    private fun loadHistory(): JSONArray =
        runCatching{JSONArray(prefs.getString("history","[]")?:"[]")}.getOrDefault(JSONArray())

    private fun saveTurn(role:String, body:String) {
        val o=org.json.JSONObject()
        o.put("role",role)
        o.put("body",body.take(800))
        items.put(o)
        // Limit local storage to last 24 turns. Never store raw recorded audio.
        if(items.length()>24) {
            val tail=JSONArray()
            for(i in items.length()-24 until items.length()) tail.put(items.getJSONObject(i))
            items=tail
        }
        prefs.edit().putString("history",items.toString()).apply()
        renderHistory()
    }

    private fun renderHistory() {
        val out=StringBuilder()
        for(i in 0 until items.length()) {
            val row=items.optJSONObject(i)?:continue
            out.append(row.optString("role")).append("  ")
                .append(row.optString("body")).append("\n\n")
        }
        historyText.text=if(out.isEmpty())"음성 또는 텍스트를 입력하여 첫 명령을 실행하세요." else out.toString()
    }

    fun destroy() {
        if(disposed)return
        stopAndDestroyRecognizer()
        active=false
        disposed=true
        root.removeView(sheet)
        root.removeView(scrim)
    }
}
