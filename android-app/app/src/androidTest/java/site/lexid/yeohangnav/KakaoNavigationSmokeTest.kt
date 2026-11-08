package site.lexid.yeohangnav

import android.content.Intent
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.kakaomobility.knsdk.map.knmapview.KNMapView
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
        var guidanceStarted = false
        var failure: String? = null
        var visibleText = ""

        assertTrue(
            "Kakao app key missing from Android test build",
            site.lexid.yeohangnav.BuildConfig.KAKAO_MOBILITY_APP_KEY.isNotBlank()
        )
        val activity = instrumentation.startActivitySync(intent)
        try {
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
                    val map = content.findViewWithTag<View>("nav-sdk-map")
                    val status = content.findViewWithTag<TextView>("nav-status")
                    val title = content.findViewWithTag<TextView>("nav-guidance-title")
                    if (map is KNMapView && status?.visibility == View.GONE &&
                        title?.text?.isNotBlank() == true) {
                        guidanceStarted = true
                    }
                }
                if (!guidanceStarted && failure == null) Thread.sleep(500)
            }
        } finally {
            instrumentation.runOnMainSync { activity.finish() }
        }

        assertEquals("Kakao navigation did not start: $failure", null, failure)
        assertTrue("Kakao navigation did not start for the test destination. Screen: $visibleText", guidanceStarted)
    }


    @Test
    fun defaultScreenFillsWithKakaoMapAndOpensDrawer() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val activity = instrumentation.startActivitySync(
            Intent(context, KakaoNavigationActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        )
        try {
            instrumentation.runOnMainSync {
                val content = activity.findViewById<ViewGroup>(android.R.id.content)
                val map = content.findViewWithTag<View>("nav-sdk-map")
                val drawer = content.findViewWithTag<View>("nav-side-drawer")
                val title = content.findViewWithTag<TextView>("nav-guidance-title")
                assertTrue("The native KNSDK map must fill the screen", map is KNMapView)
                assertTrue("The navigation map must match its parent", map?.layoutParams?.width == -1 && map?.layoutParams?.height == -1)
                assertTrue("Drawer must be closed on app launch", drawer?.visibility == View.GONE)
                assertTrue("Default screen should request a destination", title?.text?.contains("목적지") == true)
                fun findMenu(view: View): View? {
                    if (view.contentDescription?.toString() == "메뉴 열기") return view
                    if (view is ViewGroup) for (index in 0 until view.childCount) {
                        findMenu(view.getChildAt(index))?.let { return it }
                    }
                    return null
                }
                val menu = findMenu(content)
                assertTrue("Accessible menu button is required", menu != null)
                menu!!.performClick()
                assertTrue("Drawer should open after the menu action", drawer?.visibility == View.VISIBLE)
            }
        } finally {
            instrumentation.runOnMainSync { activity.finish() }
        }
    }

    private fun collectText(view: View, texts: MutableList<String>) {
        if (view is TextView) {
            view.text?.toString()?.takeIf { it.isNotBlank() }?.let(texts::add)
        } else if (view is ViewGroup) {
            for (index in 0 until view.childCount) collectText(view.getChildAt(index), texts)
        }
    }
}
