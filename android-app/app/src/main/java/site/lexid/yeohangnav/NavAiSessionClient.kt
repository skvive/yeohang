package site.lexid.yeohangnav

import android.app.Activity
import android.webkit.CookieManager
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Only posts explicit text to our own HTTPS host, using the existing website
 * login cookie. Neither speech audio nor location is uploaded by this client.
 * OPENAI_API_KEY must remain exclusively on the backend.
 */
internal object NavAiSessionClient {
    private const val ENDPOINT = "https://yeohang.lexid.site/api/nav/ai"
    fun send(activity: Activity, sessionId: String, message: String, callback: (Result<String>) -> Unit) {
        val cookies = runCatching { CookieManager.getInstance().getCookie("https://yeohang.lexid.site") }.getOrNull()
        if (cookies.isNullOrBlank()) {
            callback(Result.failure(IllegalStateException("AUTH_REQUIRED")))
            return
        }
        thread(name = "nav-ai-session", start = true) {
            val result = runCatching {
                val conn = (URL(ENDPOINT).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 7000
                    readTimeout = 25000
                    instanceFollowRedirects = false
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                    setRequestProperty("Accept", "application/json")
                    setRequestProperty("Origin", "https://yeohang.lexid.site")
                    setRequestProperty("Cookie", cookies)
                    setRequestProperty("X-YEOHANG-NAV", "android")
                }
                try {
                    val body=JSONObject().put("session_id",sessionId).put("message",message).toString()
                    conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                    val code=conn.responseCode
                    if (code==401||code==403) throw IllegalStateException("AUTH_REQUIRED")
                    if (code==404) throw IllegalStateException("BACKEND_NOT_DEPLOYED")
                    if (code==503) throw IllegalStateException("AI_NOT_CONFIGURED")
                    if (code !in 200..299) throw IllegalStateException("AI_HTTP_$code")
                    val reply=conn.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
                    JSONObject(reply).optString("reply").trim().ifBlank {
                        throw IllegalStateException("AI_EMPTY_REPLY")
                    }.take(1600)
                } finally { conn.disconnect() }
            }
            activity.runOnUiThread {
                if (!activity.isFinishing && !activity.isDestroyed) callback(result)
            }
        }
    }
}
