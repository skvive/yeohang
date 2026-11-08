package site.lexid.yeohangnav

import android.content.Intent
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NavigationQaTenStatesTest {
    @Test
    fun tenSdkIndependentUiStatesAndMainUserFlow() {
        assertTrue("QA must never be active in a release APK", BuildConfig.DEBUG)
        val inst = InstrumentationRegistry.getInstrumentation()
        val context = inst.targetContext
        for (scenario in 1..10) {
            val intent = Intent(context, KakaoNavigationActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                putExtra("nav_qa_screen", scenario)
            }
            val activity = inst.startActivitySync(intent)
            try {
                if (scenario == 2) Thread.sleep(400)
                inst.runOnMainSync {
                    val root = activity.findViewById<ViewGroup>(android.R.id.content)
                    val sdkView = root.findViewWithTag<View>("nav-sdk-map")
                    val drawer = root.findViewWithTag<View>("nav-side-drawer")
                    val status = root.findViewWithTag<TextView>("nav-status")
                    assertNotNull("Production KNSDK view must be instantiated", sdkView)
                    assertEquals(-1, sdkView.layoutParams.width)
                    assertEquals(-1, sdkView.layoutParams.height)
                    assertNotNull("Production drawer must exist", drawer)
                    assertNotNull("QA status must exist", status)
                    assertTrue(status.text.toString().contains("QA 장면"))
                    assertTrue(status.text.toString().contains("실제 카카오 경로 아님"))
                    if (scenario == 2) assertEquals(View.VISIBLE, drawer.visibility)
                    else assertEquals(View.GONE, drawer.visibility)
                    if (scenario in 3..7)
                        assertNotNull(root.findViewWithTag<View>("nav-qa-functional-panel"))
                    if (scenario == 3) {
                        fun tap(view: View): Boolean {
                            if (view.contentDescription?.toString()?.startsWith("선릉역") == true) {
                                view.performClick()
                                return true
                            }
                            if (view is ViewGroup)
                                for (n in 0 until view.childCount) if (tap(view.getChildAt(n))) return true
                            return false
                        }
                        assertTrue("Search result must be clickable", tap(root))
                        assertTrue("Search to detail transition", status.text.toString().contains("06/10"))
                    }
                }
            } finally {
                inst.runOnMainSync { activity.finish() }
            }
        }
    }
}
