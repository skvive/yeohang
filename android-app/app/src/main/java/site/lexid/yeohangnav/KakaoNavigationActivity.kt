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
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Bundle
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.widget.Button
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
import com.kakaomobility.knsdk.map.knmapview.KNMapCameraUpdate
import com.kakaomobility.knsdk.map.knmapview.KNMapTheme
import com.kakaomobility.knsdk.map.knmapview.KNMapView
import com.kakaomobility.knsdk.trip.kntrip.KNTrip
import com.kakaomobility.knsdk.trip.kntrip.knroute.KNRoute
import java.io.ByteArrayOutputStream
import java.io.File
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

    private lateinit var mapView: KNMapView
    private lateinit var status: TextView
    private lateinit var turnTitle: TextView
    private lateinit var turnDistance: TextView
    private lateinit var routeSummary: TextView
    private var locationManager: LocationManager? = null
    private var pendingLocationListener: LocationListener? = null
    private var voicePlayer: MediaPlayer? = null
    private var destinationName = ""
    private var destinationLat = 0.0
    private var destinationLng = 0.0
    private var currentRoute: KNRoute? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(17, 61, 77)
        window.navigationBarColor = Color.BLACK
        readDestination() ?: return
        showStatusScreen("카카오내비에 연결하고 있습니다.")

        (application as YeohangApplication).authenticate { authenticated, errorDetail ->
            runOnUiThread {
                if (!authenticated) {
                    status.text = "카카오내비 인증 실패: ${errorDetail ?: "SDK 오류"}"
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
            text = "목적지 · $destinationName"
            textSize = 13f
            setTextColor(Color.rgb(218, 238, 237))
            maxLines = 1
        })
        root.addView(brandBar, LinearLayout.LayoutParams(-1, dp(64)))

        val guidanceCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(18), dp(10), dp(18), dp(10))
            setBackgroundColor(Color.rgb(239, 248, 247))
        }
        turnTitle = TextView(this).apply {
            text = "현재 위치와 경로를 준비하고 있습니다."
            textSize = 19f
            setTextColor(Color.rgb(17, 61, 77))
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        }
        turnDistance = TextView(this).apply {
            text = destinationName
            textSize = 14f
            setTextColor(Color.rgb(56, 92, 99))
        }
        guidanceCard.addView(turnTitle)
        guidanceCard.addView(turnDistance)
        root.addView(guidanceCard, LinearLayout.LayoutParams(-1, dp(92)))

        mapView = KNMapView(this)
        root.addView(mapView, LinearLayout.LayoutParams(-1, 0, 1f))

        val footer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(16), dp(8), dp(16), dp(8))
            setBackgroundColor(Color.WHITE)
        }
        routeSummary = TextView(this).apply {
            text = "경로 정보를 불러오고 있습니다."
            textSize = 14f
            setTextColor(Color.rgb(31, 69, 79))
            setPadding(0, 0, dp(12), 0)
        }
        footer.addView(routeSummary, LinearLayout.LayoutParams(0, -2, 1f))
        footer.addView(Button(this).apply {
            text = "안내 종료"
            setTextColor(Color.rgb(17, 61, 77))
            setOnClickListener {
                YeohangApplication.sdk.sharedGuidance()?.stop()
                finish()
            }
        }, LinearLayout.LayoutParams(-2, -2))
        root.addView(footer, LinearLayout.LayoutParams(-1, dp(64)))

        status = TextView(this).apply {
            text = ""
            visibility = View.GONE
        }
        root.addView(status, LinearLayout.LayoutParams(-1, dp(40)))
        setContentView(root)
        YeohangApplication.sdk.bindingMapView(mapView, KNMapTheme.driveDay()) { error ->
            if (error != null) runOnUiThread {
                status.text = "카카오 지도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
                status.visibility = View.VISIBLE
            }
        }
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
            requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), LOCATION_REQUEST)
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
                    mapView.moveCamera(KNMapCameraUpdate.targetTo(startPoint), false)
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
        guidance.startWithTrip(trip, priority, 0)
    }

    override fun guidanceCheckingRouteChange(guidance: KNGuidance) {
        turnTitle.text = "경로를 다시 확인하고 있습니다."
    }

    override fun guidanceDidUpdateRoutes(guidance: KNGuidance, routes: List<KNRoute>, multiRouteInfo: KNMultiRouteInfo?) {
        currentRoute = routes.firstOrNull()
        mapView.setRoutes(routes)
        currentRoute?.let { route ->
            routeSummary.text = "${formatDistance(route.totalDist)} · 약 ${formatDuration(route.totalTime)}"
        }
    }

    override fun guidanceDidUpdateIndoorRoute(guidance: KNGuidance, route: KNRoute?) {
        route?.let { mapView.setRoute(it) }
    }

    override fun guidanceGuideEnded(guidance: KNGuidance) {
        turnTitle.text = "목적지에 도착했습니다."
        turnDistance.text = destinationName
    }

    override fun guidanceGuideStarted(guidance: KNGuidance) {
        turnTitle.text = "안내를 시작합니다."
        turnDistance.text = destinationName
    }

    override fun guidanceOutOfRoute(guidance: KNGuidance) {
        turnTitle.text = "경로를 벗어나 다시 안내합니다."
    }

    override fun guidanceRouteChanged(
        guidance: KNGuidance,
        fromRoute: KNRoute,
        fromLocation: KNLocation,
        toRoute: KNRoute,
        toLocation: KNLocation,
        changeReason: KNGuideRouteChangeReason
    ) {
        currentRoute = toRoute
        mapView.setRoute(toRoute)
        routeSummary.text = "${formatDistance(toRoute.totalDist)} · 약 ${formatDuration(toRoute.totalTime)}"
    }

    override fun guidanceRouteUnchanged(guidance: KNGuidance) = Unit

    override fun guidanceRouteUnchangedWithError(guidance: KNGuidance, error: KNError) {
        turnTitle.text = "경로를 유지하고 있습니다."
    }

    override fun guidanceDidUpdateLocation(guidance: KNGuidance, locationGuide: KNGuide_Location) {
        val location = locationGuide.locationForPrimaryRoute ?: locationGuide.location ?: return
        mapView.moveCamera(KNMapCameraUpdate.targetTo(location.pos), true)
        mapView.cullPassedRoute(location, true)
    }

    override fun guidanceDidUpdateRouteGuide(guidance: KNGuidance, routeGuide: KNGuide_Route) {
        val direction = routeGuide.curDirection
        turnTitle.text = direction?.nodeName?.takeIf { it.isNotBlank() }
            ?: direction?.directionNames?.firstOrNull()
            ?: "경로를 따라 이동하세요."
        val distance = guidance.locationGuide?.locationForPrimaryRoute
            ?.let { current -> direction?.location?.let(current::distToLocation) }
        turnDistance.text = distance?.let { "${formatDistance(it)} 후 안내 · $destinationName" }
            ?: destinationName
    }

    override fun guidanceDidUpdateSafetyGuide(guidance: KNGuidance, safetyGuide: KNGuide_Safety?) = Unit

    override fun guidanceDidUpdateAroundSafeties(guidance: KNGuidance, safeties: List<KNSafety>?) = Unit

    override fun shouldPlayVoiceGuide(guidance: KNGuidance, voiceGuide: KNGuide_Voice, newData: MutableList<ByteArray>): Boolean = true

    override fun willPlayVoiceGuide(guidance: KNGuidance, voiceGuide: KNGuide_Voice) {
        playVoiceGuide(voiceGuide)
    }

    override fun didFinishPlayVoiceGuide(guidance: KNGuidance, voiceGuide: KNGuide_Voice) = Unit

    override fun didUpdateCitsGuide(guidance: KNGuidance, citsGuide: KNGuide_Cits) = Unit

    private fun playVoiceGuide(voiceGuide: KNGuide_Voice) {
        val bytes = ByteArrayOutputStream().apply {
            voiceGuide.data.forEach { write(it) }
        }.toByteArray()
        if (bytes.isEmpty()) return
        try {
            voicePlayer?.release()
            val audioFile = File(cacheDir, "kakao-guide.mp3")
            audioFile.writeBytes(bytes)
            voicePlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                setDataSource(audioFile.absolutePath)
                setOnCompletionListener { player -> player.release(); voicePlayer = null }
                setOnErrorListener { player, _, _ -> player.release(); voicePlayer = null; true }
                prepareAsync()
                setOnPreparedListener { it.start() }
            }
        } catch (_: Exception) {
            voicePlayer?.release()
            voicePlayer = null
        }
    }

    private fun formatDistance(meters: Int): String =
        if (meters >= 1000) String.format("%.1f km", meters / 1000.0) else "$meters m"

    private fun formatDuration(seconds: Int): String {
        val minutes = (seconds / 60).coerceAtLeast(1)
        return if (minutes >= 60) "${minutes / 60}시간 ${minutes % 60}분" else "$minutes분"
    }

    override fun onDestroy() {
        pendingLocationListener?.let { locationManager?.removeUpdates(it) }
        voicePlayer?.runCatching { stop() }
        voicePlayer?.release()
        voicePlayer = null
        super.onDestroy()
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density + 0.5f).toInt()
}
