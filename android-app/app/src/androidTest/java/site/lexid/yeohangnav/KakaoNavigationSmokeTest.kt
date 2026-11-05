package site.lexid.yeohangnav

import android.content.Intent
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.kakaomobility.knsdk.ui.view.KNNaviView
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

        val activity = instrumentation.startActivitySync(intent)
        try {
            val deadline = System.currentTimeMillis() + 75_000
            while (System.currentTimeMillis() < deadline && !guidanceStarted && failure == null) {
                instrumentation.runOnMainSync {
                    val content = activity.findViewById<ViewGroup>(android.R.id.content)
                    val root = content.getChildAt(0) as? LinearLayout ?: return@onActivity
                    val header = root.getChildAt(0) as? LinearLayout
                    val title = header?.getChildAt(1) as? TextView
                    val status = root.getChildAt(2) as? TextView

                    if (title?.text?.toString()?.contains("QA Test Destination") == true &&
                        root.getChildAt(1) is KNNaviView && status?.visibility == View.GONE) {
                        guidanceStarted = true
                    } else {
                        val message = status?.text?.toString().orEmpty()
                        if (message.contains("확인할 수 없습니다") ||
                            message.contains("경로를 계산하지 못했습니다") ||
                            message.contains("경로 응답에 실패") ||
                            message.contains("위치 서비스를 켠 뒤")) {
                            failure = message
                        }
                    }
                }
                if (!guidanceStarted && failure == null) Thread.sleep(500)
            }
        } finally {
            instrumentation.runOnMainSync { activity.finish() }
        }

        assertEquals("Kakao navigation did not start: $failure", null, failure)
        assertTrue("Kakao navigation did not start for the test destination", guidanceStarted)
    }
}
