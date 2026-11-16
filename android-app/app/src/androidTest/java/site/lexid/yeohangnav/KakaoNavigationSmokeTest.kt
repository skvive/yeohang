package site.lexid.yeohangnav

import android.app.Activity
import android.app.Instrumentation
import android.content.Intent
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.kakaomobility.knsdk.map.knmapview.KNMapView
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class KakaoNavigationSmokeTest {
    @Test
    fun authenticatesAndStartsDestinationGuidance() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val intent = Intent(context, KakaoNavigationActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra(KakaoNavigationActivity.EXTRA_DESTINATION_NAME, "QA Test Destination")
            putExtra(KakaoNavigationActivity.EXTRA_DESTINATION_LAT, 37.5010)
            putExtra(KakaoNavigationActivity.EXTRA_DESTINATION_LNG, 127.0396)
        }
        assertTrue(
            "Kakao app key missing from Android test build",
            site.lexid.yeohangnav.BuildConfig.KAKAO_MOBILITY_APP_KEY.isNotBlank()
        )
        val activity = instrumentation.startActivitySync(intent)
        try {
            assertGuidanceStarted(instrumentation, activity, "QA Test Destination")
        } finally {
            instrumentation.runOnMainSync { activity.finish() }
        }
    }

    @Test
    fun webRouteStartsNativeDestinationGuidance() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val monitor = instrumentation.addMonitor(KakaoNavigationActivity::class.java.name, null, false)
        val mainActivity = instrumentation.startActivitySync(
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
        var navigationActivity: Activity? = null
        try {
            var webView: WebView? = null
            instrumentation.runOnMainSync {
                val content = mainActivity.findViewById<ViewGroup>(android.R.id.content)
                webView = findWebView(content)
            }
            val embeddedWebView = webView
                ?: throw AssertionError("MainActivity WebView was not found")
            val firstPageDeadline = System.currentTimeMillis() + 45_000
            var firstPageInjected = false
            while (System.currentTimeMillis() < firstPageDeadline && !firstPageInjected) {
                firstPageInjected = evaluateJavascript(
                    instrumentation,
                    embeddedWebView,
                    "Boolean(window.__YE0HANG_ANDROID_NAVI__)"
                ) == "true"
                if (!firstPageInjected) Thread.sleep(250)
            }
            val firstPageState = evaluateJavascript(
                instrumentation,
                embeddedWebView,
                "JSON.stringify({url:location.href,marker:!!window.__YE0HANG_ANDROID_NAVI__})"
            )
            assertTrue("MainActivity did not inject its initial first-party page: $firstPageState", firstPageInjected)

            val baseUrl = BuildConfig.NAVIGATION_HOME.substringBefore('#') + "#map"
            val fixture = """
                <!doctype html><html><head><meta name="viewport" content="width=device-width"><script>location.hash='#map'</script></head>
                <body>
                  <main id="app"><section class="section-tight"><div class="wrap"><div id="mapCanvas"></div></div></section></main>
                  <div id="mapSide"><div class="map-list-row active"><h4>Bridge QA Destination</h4></div></div>
                  <a id="openGoogleMaps" href="https://map.kakao.com/?q=37.5010%2C127.0396">길찾기</a>
                </body></html>
            """.trimIndent()
            instrumentation.runOnMainSync {
                embeddedWebView.loadDataWithBaseURL(baseUrl, fixture, "text/html", "UTF-8", null)
            }

            val readyScript = "Boolean(window.__YE0HANG_ANDROID_NAVI__ && " +
                "window.YeohangNavigation && window.YeohangNavigation.openDirections && " +
                "document.querySelector('#mapSide .map-list-row.active') && " +
                "document.querySelector('[data-ynav=route]'))"
            val readyDeadline = System.currentTimeMillis() + 20_000
            var bridgeReady = false
            while (System.currentTimeMillis() < readyDeadline && !bridgeReady) {
                bridgeReady = evaluateJavascript(instrumentation, embeddedWebView, readyScript) == "true"
                if (!bridgeReady) Thread.sleep(250)
            }
            val bridgeState = evaluateJavascript(
                instrumentation,
                embeddedWebView,
                "JSON.stringify({hash:location.hash,marker:!!window.__YE0HANG_ANDROID_NAVI__," +
                    "api:!!window.YeohangNavigation?.openDirections," +
                    "selected:!!document.querySelector('#mapSide .map-list-row.active')," +
                    "route:!!document.querySelector('[data-ynav=route]')})"
            )
            assertTrue("Bundled V9 route action was not injected into the trusted WebView: $bridgeState", bridgeReady)

            instrumentation.runOnMainSync {
                embeddedWebView.evaluateJavascript("document.querySelector('[data-ynav=route]').click()", null)
            }
            navigationActivity = instrumentation.waitForMonitorWithTimeout(monitor, 75_000)
            assertTrue("Web route did not open KakaoNavigationActivity", navigationActivity != null)
            assertGuidanceStarted(
                instrumentation,
                navigationActivity!!,
                "Bridge QA Destination"
            )
        } finally {
            navigationActivity?.let { activity ->
                instrumentation.runOnMainSync { activity.finish() }
            }
            instrumentation.runOnMainSync { mainActivity.finish() }
            instrumentation.removeMonitor(monitor)
        }
    }

    private fun assertGuidanceStarted(
        instrumentation: Instrumentation,
        activity: Activity,
        destinationName: String
    ) {
        var guidanceStarted = false
        var failure: String? = null
        var visibleText = ""
        val deadline = System.currentTimeMillis() + 75_000
        while (System.currentTimeMillis() < deadline && !guidanceStarted && failure == null) {
            instrumentation.runOnMainSync {
                val content = activity.findViewById<ViewGroup>(android.R.id.content)
                val screenText = mutableListOf<String>()
                collectText(content, screenText)
                visibleText = screenText.joinToString(" | ")
                failure = screenText.firstOrNull { message ->
                    message.contains("확인할 수 없습니다") ||
                        message.contains("인증 실패") ||
                        message.contains("경로를 계산하지 못했습니다") ||
                        message.contains("경로 응답에 실패") ||
                        message.contains("위치 서비스를 켠 뒤")
                }
                if (failure != null) return@runOnMainSync
                val root = content.getChildAt(0) as? LinearLayout ?: return@runOnMainSync
                val title = root.getChildAt(0) as? LinearLayout
                val destination = title?.getChildAt(1) as? TextView
                val map = root.getChildAt(2)
                val status = root.getChildAt(4) as? TextView

                if (destination?.text?.toString()?.contains(destinationName) == true &&
                    map is KNMapView && status?.visibility == View.GONE) {
                    guidanceStarted = true
                }
            }
            if (!guidanceStarted && failure == null) Thread.sleep(500)
        }

        assertEquals("Kakao navigation did not start: $failure", null, failure)
        assertTrue("Kakao navigation did not start for $destinationName. Screen: $visibleText", guidanceStarted)
    }

    private fun findWebView(view: View): WebView? {
        if (view is WebView) return view
        if (view is ViewGroup) {
            for (index in 0 until view.childCount) {
                findWebView(view.getChildAt(index))?.let { return it }
            }
        }
        return null
    }

    private fun evaluateJavascript(
        instrumentation: Instrumentation,
        webView: WebView,
        script: String
    ): String? {
        val completed = CountDownLatch(1)
        var result: String? = null
        instrumentation.runOnMainSync {
            webView.evaluateJavascript(script) { value ->
                result = value
                completed.countDown()
            }
        }
        assertTrue("WebView JavaScript evaluation timed out", completed.await(10, TimeUnit.SECONDS))
        return result
    }

    private fun collectText(view: View, texts: MutableList<String>) {
        if (view is TextView) {
            view.text?.toString()?.takeIf { it.isNotBlank() }?.let(texts::add)
        } else if (view is ViewGroup) {
            for (index in 0 until view.childCount) collectText(view.getChildAt(index), texts)
        }
    }
}
