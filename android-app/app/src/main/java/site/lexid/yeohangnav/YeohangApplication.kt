package site.lexid.yeohangnav

import android.app.Application
import com.kakaomobility.knsdk.KNLanguageType
import com.kakaomobility.knsdk.KNSDK

class YeohangApplication : Application() {
    companion object {
        lateinit var sdk: KNSDK
            private set
    }

    override fun onCreate() {
        super.onCreate()
        sdk = KNSDK.apply {
            install(this@YeohangApplication, "$filesDir/kakao-navigation")
        }
    }

    fun authenticate(onResult: (Boolean) -> Unit) {
        val appKey = BuildConfig.KAKAO_MOBILITY_APP_KEY.trim()
        if (appKey.isEmpty()) {
            onResult(false)
            return
        }
        sdk.initializeWithAppKey(
            appKey,
            BuildConfig.VERSION_NAME,
            "yeohang-android",
            KNLanguageType.KNLanguageType_KOREAN,
            completion = { error -> onResult(error == null) }
        )
    }
}
