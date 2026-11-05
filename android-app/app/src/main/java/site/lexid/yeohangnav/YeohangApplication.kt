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
            aAppKey = appKey,
            aClientVersion = BuildConfig.VERSION_NAME,
            aLangType = KNLanguageType.KNLanguageType_KOREAN,
            aCompletion = { error -> onResult(error == null) }
        )
    }
}
