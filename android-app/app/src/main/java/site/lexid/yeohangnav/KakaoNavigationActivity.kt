package site.lexid.yeohangnav

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.location.Criteria
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.kakaomobility.knsdk.KNRoutePriority
import com.kakaomobility.knsdk.guidance.knguidance.*
import com.kakaomobility.knsdk.guidance.knguidance.common.KNLocation
import com.kakaomobility.knsdk.guidance.knguidance.citsguide.KNGuide_Cits
import com.kakaomobility.knsdk.guidance.knguidance.locationguide.KNGuide_Location
import com.kakaomobility.knsdk.guidance.knguidance.routeguide.KNGuide_Route
import com.kakaomobility.knsdk.guidance.knguidance.routeguide.objects.KNMultiRouteInfo
import com.kakaomobility.knsdk.guidance.knguidance.safetyguide.KNGuide_Safety
import com.kakaomobility.knsdk.guidance.knguidance.safetyguide.objects.KNSafety
import com.kakaomobility.knsdk.guidance.knguidance.voiceguide.KNGuide_Voice
import com.kakaomobility.knsdk.common.objects.KNPOI
import com.kakaomobility.knsdk.common.objects.KNError
import com.kakaomobility.knsdk.trip.kntrip.KNTrip
import com.kakaomobility.knsdk.trip.kntrip.knroute.KNRoute
import com.kakaomobility.knsdk.ui.view.KNNaviView
import kotlin.math.roundToInt

class KakaoNavigationActivity : Activity(),
    KNGuidance_GuideStateDelegate,
    KNGuidance_LocationGuideDelegate,
    KNGuidance_RouteGuideDelegate,
    KNGuidance_SafetyGuideDelegate,
    KNGuidance_VoiceGuideDelegate,
    KNGuidance_CitsGuideDelegate {

    companion object {
        const val EXTRA_DESTINATION_NAME = "destination_name"
        const val EXTRA_DESTINATION_LAT = "destination_lat"
        const val EXTRA_DESTINATION_LNG = "destination_lng"
        private const val LOCATION_REQUEST = 2310
    }

    private lateinit var naviView: KNNaviView
    private lateinit var status: TextView
    private var locationManager: LocationManager? = null
    private var pendingLocationListener: LocationListener? = null
    private var destinationName = ""
    private var destinationLat = 0.0
    private var destinationLng = 0.0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(17, 61, 77)
        window.navigationBarColor = Color.BLACK
        readDestination() ?: return
        showStatusScreen("카카오내비에 연결하고 있습니다.")

        (application as YeohangApplication).authenticate { authenticated ->
            runOnUiThread {
                if (!authenticated) {
                    status.text = "카카오내비 연결을 확인할 수 없습니다. 앱 키와 등록 상태를 확인해 주세요."
                    return@runOnUiThread
                }
                buildBrandedNavigationScreen()
                checkLocationPermission()
            }
        }
    }

    private fun readDestination(): Unit? {
        destinationName = intent.getStringExtra(EXTRA_DESTINATION_NAME)?.trim().orEmpty()
        destinationLat = intent.getDoubleExtra(EXTRA_DESTINATION_LAT, Double.NaN)
        destinationLng = intent.getDoubleExtra(EXTRA_DESTINATION_LNG, Double.NaN)
        if (destinationName.isEmpty() || destinationName.length > 120 ||
            !destinationLat.isFinite() || destinationLat !in -90.0..90.0 ||
            !destinationLng.isFinite() || destinationLng !in -180.0..180.0) {
            Toast.makeText(this, "목적지 정보를 확인할 수 없습니다.", Toast.LENGTH_LONG).show()
            finish()
            return null
        }
        return Unit
    }

    private fun buildBrandedNavigationScreen() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.WHITE)
        }
        val brandBar = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(18), dp(8), dp(18), dp(8))
            setBackgroundColor(Color.rgb(17, 61, 77))
        }
        brandBar.addView(TextView(this).apply {
            text = "여행갈지도"
            textSize = 18f
            setTextColor(Color.WHITE)
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        })
        brandBar.addView(TextView(this).apply {
            text = "카카오내비 길안내 · $destinationName"
            textSize = 13f
            setTextColor(Color.rgb(218, 238, 237))
            maxLines = 1
        })
        root.addView(brandBar, LinearLayout.LayoutParams(-1, dp(64)))

        naviView = KNNaviView(this).apply {
            useDarkMode = false
            sndVolume = 1f
        }
        root.addView(naviView, LinearLayout.LayoutParams(-1, 0, 1f))

        status = TextView(this).apply {
            text = "현재 위치와 경로를 준비하고 있습니다."
            textSize = 14f
            gravity = Gravity.CENTER
            setTextColor(Color.rgb(31, 69, 79))
            setBackgroundColor(Color.rgb(239, 248, 247))
            setPadding(dp(12), dp(8), dp(12), dp(8))
        }
        root.addView(status, LinearLayout.LayoutParams(-1, dp(46)))
        setContentView(root)
    }

    private fun showStatusScreen(message: String) {
        status = TextView(this).apply {
            text = message
            textSize = 15f
            gravity = Gravity.CENTER
            setTextColor(Color.rgb(31, 69, 79))
            setBackgroundColor(Color.WHITE)
        }
        setContentView(status)
    }

    private fun checkLocationPermission() {
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                LOCATION_REQUEST
            )
            return
        }
        requestCurrentLocation()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != LOCATION_REQUEST) return
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            requestCurrentLocation()
        } else status.text = "정확한 현재 위치 권한이 없어 길안내를 시작하지 않았습니다."
    }

    @Suppress("DEPRECATION")
    private fun requestCurrentLocation() {
        try {
            val manager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            locationManager = manager
            val criteria = Criteria().apply { accuracy = Criteria.ACCURACY_FINE }
            val provider = manager.getBestProvider(criteria, true)
            if (provider == null) {
                status.text = "기기의 위치 서비스를 켠 뒤 다시 시도해 주세요."
                return
            }
            status.text = "GPS 위치를 확인하고 있습니다."
            val listener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    locationManager?.removeUpdates(this)
                    pendingLocationListener = null
                    startRoute(location)
                }
                override fun onProviderEnabled(provider: String) = Unit
                override fun onProviderDisabled(provider: String) = Unit
                override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit
            }
            pendingLocationListener = listener
            manager.requestSingleUpdate(provider, listener, Looper.getMainLooper())
        } catch (_: SecurityException) {
            status.text = "위치 권한이 없어 길안내를 시작하지 않았습니다."
        } catch (_: IllegalArgumentException) {
            status.text = "현재 위치를 가져오지 못했습니다. 위치 서비스를 확인해 주세요."
        }
    }

    private fun startRoute(origin: Location) {
        status.text = "카카오내비 경로를 계산하고 있습니다."
        val startPoint = YeohangApplication.sdk.convertWGS84ToKATEC(origin.longitude, origin.latitude)
        val goalPoint = YeohangApplication.sdk.convertWGS84ToKATEC(destinationLng, destinationLat)
        val start = KNPOI("현재 위치", startPoint.x.roundToInt(), startPoint.y.roundToInt(), "현재 위치")
        val goal = KNPOI(destinationName, goalPoint.x.roundToInt(), goalPoint.y.roundToInt(), destinationName)
        val priority = KNRoutePriority.KNRoutePriority_Recommand
        YeohangApplication.sdk.makeTripWithStart(start, goal, null) { error, trip ->
            if (error != null || trip == null) {
                runOnUiThread { status.text = "경로를 계산하지 못했습니다. 잠시 후 다시 시도해 주세요." }
                return@makeTripWithStart
            }
            trip.routeWithPriority(priority, 0) { routeError, _ ->
                runOnUiThread {
                    if (routeError != null) {
                        status.text = "카카오내비 경로 응답에 실패했습니다."
                        return@runOnUiThread
                    }
                    startGuidance(trip, priority)
                }
            }
        }
    }

    private fun startGuidance(trip: KNTrip, priority: KNRoutePriority) {
        val guidance = YeohangApplication.sdk.sharedGuidance()
        if (guidance == null) {
            status.text = "카카오내비 안내 기능을 초기화하지 못했습니다."
            return
        }
        guidance.apply {
            guideStateDelegate = this@KakaoNavigationActivity
            locationGuideDelegate = this@KakaoNavigationActivity
            routeGuideDelegate = this@KakaoNavigationActivity
            safetyGuideDelegate = this@KakaoNavigationActivity
            voiceGuideDelegate = this@KakaoNavigationActivity
            citsGuideDelegate = this@KakaoNavigationActivity
        }
        status.visibility = View.GONE
        naviView.initWithGuidance(guidance, trip, priority, 0)
    }

    override fun guidanceCheckingRouteChange(guidance: KNGuidance) = naviView.guidanceCheckingRouteChange(guidance)
    override fun guidanceDidUpdateRoutes(guidance: KNGuidance, routes: List<KNRoute>, multiRouteInfo: KNMultiRouteInfo?) =
        naviView.guidanceDidUpdateRoutes(guidance, routes, multiRouteInfo)
    override fun guidanceDidUpdateIndoorRoute(guidance: KNGuidance, route: KNRoute?) =
        naviView.guidanceDidUpdateIndoorRoute(guidance, route)
    override fun guidanceGuideEnded(guidance: KNGuidance) = naviView.guidanceGuideEnded(guidance)
    override fun guidanceGuideStarted(guidance: KNGuidance) = naviView.guidanceGuideStarted(guidance)
    override fun guidanceOutOfRoute(guidance: KNGuidance) = naviView.guidanceOutOfRoute(guidance)
    override fun guidanceRouteChanged(
        guidance: KNGuidance,
        fromRoute: KNRoute,
        fromLocation: KNLocation,
        toRoute: KNRoute,
        toLocation: KNLocation,
        changeReason: KNGuideRouteChangeReason
    ) = naviView.guidanceRouteChanged(guidance)
    override fun guidanceRouteUnchanged(guidance: KNGuidance) = naviView.guidanceRouteUnchanged(guidance)
    override fun guidanceRouteUnchangedWithError(guidance: KNGuidance, error: KNError) =
        naviView.guidanceRouteUnchangedWithError(guidance, error)
    override fun guidanceDidUpdateLocation(guidance: KNGuidance, locationGuide: KNGuide_Location) =
        naviView.guidanceDidUpdateLocation(guidance, locationGuide)
    override fun guidanceDidUpdateRouteGuide(guidance: KNGuidance, routeGuide: KNGuide_Route) =
        naviView.guidanceDidUpdateRouteGuide(guidance, routeGuide)
    override fun guidanceDidUpdateSafetyGuide(guidance: KNGuidance, safetyGuide: KNGuide_Safety?) =
        naviView.guidanceDidUpdateSafetyGuide(guidance, safetyGuide)
    override fun guidanceDidUpdateAroundSafeties(guidance: KNGuidance, safeties: List<KNSafety>?) =
        naviView.guidanceDidUpdateAroundSafeties(guidance, safeties)
    override fun shouldPlayVoiceGuide(guidance: KNGuidance, voiceGuide: KNGuide_Voice, newData: MutableList<ByteArray>) =
        naviView.shouldPlayVoiceGuide(guidance, voiceGuide, newData)
    override fun willPlayVoiceGuide(guidance: KNGuidance, voiceGuide: KNGuide_Voice) = naviView.willPlayVoiceGuide(guidance, voiceGuide)
    override fun didFinishPlayVoiceGuide(guidance: KNGuidance, voiceGuide: KNGuide_Voice) =
        naviView.didFinishPlayVoiceGuide(guidance, voiceGuide)
    override fun didUpdateCitsGuide(guidance: KNGuidance, citsGuide: KNGuide_Cits) = naviView.didUpdateCitsGuide(guidance, citsGuide)

    override fun onDestroy() {
        pendingLocationListener?.let { locationManager?.removeUpdates(it) }
        super.onDestroy()
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density + 0.5f).toInt()
}
