package site.lexid.yeohangnav

import android.content.Intent
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NavVoiceCommandEngineTest {
    @Test fun koreanCommandsUseAllowlist() {
        val parse=NavVoiceCommandEngine::interpret
        assertEquals(NavVoiceCommandEngine.Action.OPEN_MENU,parse("메뉴 열어").action)
        assertEquals(NavVoiceCommandEngine.Action.CLOSE_MENU,parse("사이드바 닫아").action)
        assertEquals(NavVoiceCommandEngine.Action.OPEN_LODGING,parse("주변 숙소 찾아줘").action)
        assertEquals(NavVoiceCommandEngine.Action.OPEN_PLACES,parse("관광지 보여줘").action)
        assertEquals(NavVoiceCommandEngine.Action.MUTE_GUIDANCE,parse("음성 꺼").action)
        assertEquals(NavVoiceCommandEngine.Action.UNMUTE_GUIDANCE,parse("음성 켜").action)
        assertEquals(NavVoiceCommandEngine.Action.SEARCH_DESTINATION,parse("서울역으로 안내").action)
        assertEquals(NavVoiceCommandEngine.Action.STOP_GUIDANCE,parse("길안내 종료").action)
        assertEquals(NavVoiceCommandEngine.Action.ASK_AI,parse("이번 주말 비 올까?").action)
        assertEquals(NavVoiceCommandEngine.Action.HELP,parse(" ").action)
        assertEquals("서울역으로 안내",parse("서울역으로 안내").query)
    }

    @Test fun voiceUiOpensAndCanExecuteTypedMenuCommandWithoutKakaoCredentials() {
        val inst=InstrumentationRegistry.getInstrumentation()
        val context=inst.targetContext
        val activity=inst.startActivitySync(Intent(context,KakaoNavigationActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            putExtra("nav_qa_screen",1)
        })
        fun find(root:View,description:String):View? {
            if(root.contentDescription?.toString()==description) return root
            if(root is ViewGroup) for(i in 0 until root.childCount)
                find(root.getChildAt(i),description)?.let{return it}
            return null
        }
        try {
            inst.runOnMainSync {
                val root=activity.findViewById<ViewGroup>(android.R.id.content)
                val fab=find(root,"AI 음성 명령 열기")
                assertTrue("Voice entry must be available over navigation",fab!=null)
                fab!!.performClick()
                val sheet=root.findViewWithTag<View>("nav-ai-voice-sheet")
                assertEquals(View.VISIBLE,sheet.visibility)
                val editor=find(root,"음성 변환 텍스트 및 AI 명령어 입력") as EditText
                editor.setText("메뉴 열어")
                val run=find(root,"인식된 텍스트의 기기 명령 실행")
                assertTrue(run!=null)
                run!!.performClick()
                val drawer=root.findViewWithTag<View>("nav-side-drawer")
                assertEquals("Voice command must open real production drawer",View.VISIBLE,drawer.visibility)
                assertEquals("Voice sheet closes after menu command",View.GONE,sheet.visibility)
            }
        } finally { inst.runOnMainSync { activity.finish() } }
    }
}
