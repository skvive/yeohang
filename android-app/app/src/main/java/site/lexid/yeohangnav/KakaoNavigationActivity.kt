package site.lexid.yeohangnav

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.location.Criteria
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Bundle
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
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
import com.kakaomobility.knsdk.common.util.FloatPoint
import com.kakaomobility.knsdk.map.knmaprenderer.objects.KNMapCameraUpdate
import com.kakaomobility.knsdk.map.uicustomsupport.renewal.theme.base.KNMapTheme
import com.kakaomobility.knsdk.map.knmapview.KNMapView
import com.kakaomobility.knsdk.trip.kntrip.KNTrip
import com.kakaomobility.knsdk.trip.kntrip.knroute.KNRoute
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject
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
    private var guidanceStarted = false
    private var guidanceEnded = false
    // Debug-only test seam: never accepts route or location data from mock during release.
    private var qaScreen = 0
    private lateinit var qaRoot: android.widget.FrameLayout
    private var qaPanel: View? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(17, 61, 77)
        window.navigationBarColor = Color.BLACK
        qaScreen = if (BuildConfig.DEBUG) intent.getIntExtra("nav_qa_screen", 0).coerceIn(0, 10) else 0
        readDestination() ?: return
        buildBrandedNavigationScreen()
        if (qaScreen > 0) {
            renderQaScreen()
            return
        }
        // KNSDK requires foreground GPS permission before SDK certification (C302).
        // Never ask for background location or use a synthetic default origin.
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            showStatus("카카오 지도 표시를 위해 현재 위치 권한이 필요합니다.")
            requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), LOCATION_REQUEST)
        } else {
            authenticateAndBindMap()
        }
    }

    private fun authenticateAndBindMap() {
        showStatus("카카오내비 SDK 인증을 확인하고 있습니다.")
        (application as YeohangApplication).authenticate { authenticated, errorDetail ->
            runOnUiThread {
                if (isFinishing || isDestroyed) return@runOnUiThread
                if (!authenticated) {
                    showStatus("카카오내비 SDK 인증 실패: " + (errorDetail ?: "SDK 오류"))
                    return@runOnUiThread
                }
                YeohangApplication.sdk.bindingMapView(mapView, KNMapTheme.driveDay()) { error ->
                    runOnUiThread {
                        if (error != null) {
                            showStatus("카카오 지도를 불러오지 못했습니다. 네트워크와 인증을 확인해 주세요.")
                        } else if (destinationName.isBlank()) {
                            status.visibility = View.GONE
                            focusMapOnCurrentLocation()
                        } else {
                            showStatus("GPS를 확인하고 있습니다.")
                        }
                    }
                }
                if (destinationName.isNotBlank()) requestCurrentLocation()
            }
        }
    }

    // Standby mode: center the real Kakao map without starting a route.
    @Suppress("DEPRECATION")
    private fun focusMapOnCurrentLocation() {
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return
        try {
            val manager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val provider = manager.getBestProvider(Criteria().apply { accuracy = Criteria.ACCURACY_FINE }, true) ?: return
            val listener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    manager.removeUpdates(this)
                    val point = YeohangApplication.sdk.convertWGS84ToKATEC(location.longitude, location.latitude)
                    mapView.moveCamera(
                        KNMapCameraUpdate.targetTo(FloatPoint(point.x.toFloat(), point.y.toFloat())),
                        false
                    )
                }
                override fun onProviderEnabled(provider: String) = Unit
                override fun onProviderDisabled(provider: String) = Unit
                override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit
            }
            pendingLocationListener = listener
            locationManager = manager
            manager.requestSingleUpdate(provider, listener, Looper.getMainLooper())
        } catch (_: SecurityException) {
            showStatus("위치 권한을 확인한 뒤 지도 연결을 다시 시도해 주세요.")
        } catch (_: IllegalArgumentException) {
            showStatus("GPS를 활성화한 뒤 지도 연결을 다시 시도해 주세요.")
        }
    }

    private fun readDestination(): Unit? {
        // The launcher intentionally opens navigation-only mode with no destination.
        if (!intent.hasExtra(EXTRA_DESTINATION_NAME) &&
            !intent.hasExtra(EXTRA_DESTINATION_LAT) &&
            !intent.hasExtra(EXTRA_DESTINATION_LNG)) {
            destinationName = ""
            return Unit
        }
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

    // Map is the entire native navigation surface. All controls float over KNSDK's KNMapView.
    private fun navShape(color: Int, radius: Int): android.graphics.drawable.GradientDrawable =
        android.graphics.drawable.GradientDrawable().apply {
            setColor(color)
            cornerRadius = dp(radius).toFloat()
        }

    private fun buildBrandedNavigationScreen() {
        val root = android.widget.FrameLayout(this).apply {
            setBackgroundColor(Color.rgb(222, 232, 228))
        }

        mapView = KNMapView(this).apply {
            tag = "nav-sdk-map"
            contentDescription = "카카오내비 SDK 전체 화면 지도"
        }
        root.addView(mapView, android.widget.FrameLayout.LayoutParams(-1, -1))
        if (BuildConfig.DEBUG && qaScreen > 0) {
            root.addView(NavigationQaMapView(this), android.widget.FrameLayout.LayoutParams(-1, -1))
        }
        qaRoot = root

        val top = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(10), dp(9), dp(13), dp(9))
            background = navShape(Color.rgb(12, 69, 73), 20)
            elevation = dp(8).toFloat()
        }
        val menu = TextView(this).apply {
            text = "☰"
            contentDescription = "메뉴 열기"
            textSize = 25f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            background = navShape(Color.rgb(22, 107, 107), 16)
            setOnClickListener { openDrawer() }
        }
        top.addView(menu, LinearLayout.LayoutParams(dp(52), dp(56)))
        val turn = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(13), 0, 0, 0)
            gravity = Gravity.CENTER_VERTICAL
        }
        turnTitle = TextView(this).apply {
            text = if (destinationName.isBlank()) "목적지를 검색하세요" else "길안내를 준비하고 있습니다"
            textSize = 20f
            maxLines = 2
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setTextColor(Color.WHITE)
            tag = "nav-guidance-title"
        }
        turnDistance = TextView(this).apply {
            text = if (destinationName.isBlank()) "메뉴에서 목적지를 선택하세요" else destinationName
            textSize = 13f
            maxLines = 1
            setTextColor(Color.rgb(202, 235, 226))
        }
        turn.addView(turnTitle)
        turn.addView(turnDistance)
        top.addView(turn, LinearLayout.LayoutParams(0, -2, 1f))
        val topParams = android.widget.FrameLayout.LayoutParams(-1, -2, Gravity.TOP).apply {
            setMargins(dp(12), dp(12), dp(12), 0)
        }
        root.addView(top, topParams)
        // Android 15+ edge-to-edge can draw system icons over app chrome.
        root.setOnApplyWindowInsetsListener { _, insets ->
            val insetTop = if (android.os.Build.VERSION.SDK_INT >= 30)
                insets.getInsets(android.view.WindowInsets.Type.statusBars()).top
                else insets.systemWindowInsetTop
            topParams.topMargin = insetTop + dp(12)
            top.layoutParams = topParams
            insets
        }

        val bottom = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(18), dp(10), dp(10), dp(10))
            background = navShape(Color.WHITE, 20)
            elevation = dp(8).toFloat()
        }
        routeSummary = TextView(this).apply {
            text = if (destinationName.isBlank()) "여행갈지도 NAV · 목적지 검색" else "경로를 불러오고 있습니다."
            textSize = 15f
            maxLines = 2
            setTextColor(Color.rgb(17, 61, 77))
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        }
        bottom.addView(routeSummary, LinearLayout.LayoutParams(0, -2, 1f))
        stopButton = Button(this).apply {
            text = "종료"
            visibility = View.GONE
            contentDescription = "길안내 종료"
            setOnClickListener {
                if (qaScreen > 0) switchQaScreen(1) else {
                    YeohangApplication.sdk.sharedGuidance()?.stop()
                    showPostDriveScreen()
                }
            }
        }
        bottom.addView(stopButton, LinearLayout.LayoutParams(-2, dp(52)))
        root.addView(bottom, android.widget.FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM).apply {
            setMargins(dp(12), 0, dp(12), dp(14))
        })

        status = TextView(this).apply {
            text = ""
            textSize = 13f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            background = navShape(Color.rgb(30, 62, 65), 12)
            setPadding(dp(12), dp(12), dp(12), dp(12))
            tag = "nav-status"
            visibility = View.GONE
            elevation = dp(10).toFloat()
        }
        root.addView(status, android.widget.FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM).apply {
            setMargins(dp(24), 0, dp(24), dp(102))
        })

        scrim = View(this).apply {
            setBackgroundColor(Color.argb(145, 0, 25, 29))
            visibility = View.GONE
            contentDescription = "메뉴 닫기"
            setOnClickListener { closeDrawer() }
        }
        root.addView(scrim, android.widget.FrameLayout.LayoutParams(-1, -1))

        val drawerWidth = kotlin.math.min(dp(340), resources.displayMetrics.widthPixels - dp(56))
        drawer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.WHITE)
            visibility = View.GONE
            translationX = -drawerWidth.toFloat()
            elevation = dp(18).toFloat()
            contentDescription = "여행갈지도 내비게이션 사이드 메뉴"
            tag = "nav-side-drawer"
        }
        val drawerHeading = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(38), dp(24), dp(24))
            setBackgroundColor(Color.rgb(12, 69, 73))
        }
        drawerHeading.addView(TextView(this).apply {
            text = "여행갈지도 NAV"
            textSize = 24f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setTextColor(Color.WHITE)
        })
        drawerHeading.addView(TextView(this).apply {
            text = "어디로 갈까요?"
            textSize = 15f
            setTextColor(Color.rgb(205, 233, 225))
            setPadding(0, dp(8), 0, 0)
        })
        drawer.addView(drawerHeading, LinearLayout.LayoutParams(-1, dp(155)))
        val drawerItems = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10), dp(14), dp(10), 0)
        }
        addDrawerItem(drawerItems, "⌕   목적지 검색") { if (qaScreen > 0) switchQaScreen(3) else openTravelCatalog() }
        addDrawerItem(drawerItems, "⌂   내 주변 숙소") { if (qaScreen > 0) switchQaScreen(4) else openTravelCatalog() }
        addDrawerItem(drawerItems, "♧   관광지 · 맛집") {
            if (qaScreen > 0) {
                switchQaScreen(5)
            } else if (guidanceStarted && !guidanceEnded) {
                Toast.makeText(this, "안전한 곳에 정차한 뒤 탐색해 주세요.", Toast.LENGTH_LONG).show()
                closeDrawer()
            } else {
                closeDrawer()
                openBrowseUrl("https://yeohang.lexid.site/places")
            }
        }
        addDrawerItem(drawerItems, "♬   음성 안내 켜기 / 끄기") {
            voiceMuted = !voiceMuted
            if (qaScreen > 0) { switchQaScreen(10); return@addDrawerItem }
            Toast.makeText(this, if (voiceMuted) "음성 안내를 껐습니다" else "음성 안내를 켰습니다", Toast.LENGTH_SHORT).show()
            closeDrawer()
        }
        addDrawerItem(drawerItems, "✕   메뉴 닫기") { closeDrawer() }
        drawer.addView(ScrollView(this).apply { addView(drawerItems) }, LinearLayout.LayoutParams(-1, 0, 1f))
        root.addView(drawer, android.widget.FrameLayout.LayoutParams(drawerWidth, -1, Gravity.START))
        setContentView(root)
    }

    private lateinit var scrim: View
    private lateinit var drawer: LinearLayout
    private lateinit var stopButton: Button
    private var drawerOpen = false
    private var voiceMuted = false

    private fun addDrawerItem(parent: LinearLayout, title: String, action: () -> Unit) {
        parent.addView(TextView(this).apply {
            text = title
            textSize = 18f
            gravity = Gravity.CENTER_VERTICAL
            setTextColor(Color.rgb(17, 61, 77))
            setPadding(dp(18), 0, dp(12), 0)
            contentDescription = title
            setOnClickListener { action() }
        }, LinearLayout.LayoutParams(-1, dp(64)))
    }

    private fun openDrawer() {
        if (drawerOpen) return
        drawerOpen = true
        scrim.visibility = View.VISIBLE
        drawer.visibility = View.VISIBLE
        drawer.animate().translationX(0f).setDuration(200).start()
    }

    private fun closeDrawer() {
        if (!drawerOpen) return
        drawerOpen = false
        scrim.visibility = View.GONE
        drawer.animate().translationX(-drawer.width.toFloat()).setDuration(180).withEndAction {
            if (!drawerOpen) drawer.visibility = View.GONE
        }.start()
    }

    private fun openTravelCatalog() {
        closeDrawer()
        if (guidanceStarted && !guidanceEnded) {
            Toast.makeText(this, "안전한 곳에 정차한 후 여행 정보를 탐색해 주세요.", Toast.LENGTH_LONG).show()
            return
        }
        startActivity(Intent(this, MainActivity::class.java))
    }


    /** QA scenario reuses the production drawer and turn/ETA controls, with a marked mock route. */
    private fun switchQaScreen(next: Int) {
        if (qaScreen == 0 || !BuildConfig.DEBUG) return
        if (drawerOpen) closeDrawer()
        qaScreen = next.coerceIn(1, 10)
        renderQaScreen()
    }

    private fun renderQaScreen() {
        if (!BuildConfig.DEBUG || qaScreen == 0) return
        qaPanel?.let { qaRoot.removeView(it) }
        qaPanel = null
        val names = arrayOf(
            "", "전체화면 지도 대기", "사이드바 메뉴", "목적지 검색",
            "주변 숙소", "관광지·맛집", "목적지 상세",
            "경로 미리보기", "모의 길안내", "모의 경로 재탐색", "음성 안내 OFF"
        )
        stopButton.visibility = if (qaScreen == 8 || qaScreen == 9) View.VISIBLE else View.GONE
        turnTitle.text = when (qaScreen) {
            7 -> "추천 경로 · 8.2 km"
            8 -> "350 m 후 우회전"
            9 -> "경로를 다시 계산합니다"
            10 -> "음성 안내가 꺼졌어요"
            else -> "여행갈지도 NAV"
        }
        turnDistance.text = when (qaScreen) {
            8 -> "강남대로 · 차로 유지 (데모)"
            9 -> "다음 안전한 경로 검색 (데모)"
            7 -> "강남역 → 선릉역 · 테스트 데이터"
            else -> "SDK 인증 전 UI 기능 점검"
        }
        routeSummary.text = when (qaScreen) {
            7 -> "19분 예상 · 8.2 km · QA 데이터"
            8 -> "18분 남음 · QA 주행 재현"
            9 -> "경로 탐색 중 · QA 알림"
            10 -> "음성 안내 꺼짐 · 알림만 표시"
            else -> "여행갈지도 NAV · UI 검증"
        }
        showStatus("QA 장면 %02d/10 · %s · 실제 카카오 경로 아님".format(qaScreen, names[qaScreen]))
        if (qaScreen == 2) {
            drawer.post { if (!isFinishing && !drawerOpen) openDrawer() }
            return
        }
        if (qaScreen == 1 || qaScreen == 8 || qaScreen == 9 || qaScreen == 10) return
        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(18), dp(20), dp(18))
            background = navShape(Color.WHITE, 22)
            elevation = dp(11).toFloat()
            tag = "nav-qa-functional-panel"
            contentDescription = names[qaScreen]
        }
        fun heading(label: String) {
            panel.addView(TextView(this).apply {
                text = label
                textSize = 21f
                setTextColor(Color.rgb(14, 61, 67))
                setTypeface(typeface, android.graphics.Typeface.BOLD)
                setPadding(0, dp(3), 0, dp(12))
            })
        }
        fun detail(label: String) {
            panel.addView(TextView(this).apply {
                text = label
                textSize = 13f
                setTextColor(Color.rgb(96, 105, 106))
                setPadding(0, 0, 0, dp(15))
            })
        }
        fun action(label: String, to: Int) {
            panel.addView(TextView(this).apply {
                text = label + "     ›"
                contentDescription = label
                textSize = 17f
                setTextColor(Color.rgb(12, 78, 82))
                setPadding(dp(13), dp(13), dp(13), dp(13))
                background = navShape(Color.rgb(234, 247, 243), 13)
                setOnClickListener { switchQaScreen(to) }
            }, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(8) })
        }
        when (qaScreen) {
            3 -> {
                heading("어디로 갈까요?")
                detail("목적지 검색 UI · SDK 응답 없이 동작 확인")
                action("선릉역 · 모의 목적지 선택", 6)
                action("주변 숙소 보기", 4)
            }
            4 -> {
                heading("내 주변 숙소")
                detail("실제 API 응답이 아닌 화면 연결 QA 샘플")
                action("가상 숙소 A · 상세 보기", 6)
                action("호텔 · 모텔 · 펜션 필터", 4)
            }
            5 -> {
                heading("관광지 · 맛집")
                detail("선택 흐름 검사용 샘플 콘텐츠")
                action("도심 공원 · 목적지", 6)
                action("가상 맛집 B · 목적지", 6)
            }
            6 -> {
                heading("목적지 상세")
                detail("선릉역 · QA 테스트 좌표 · 실제 검색결과 아님")
                action("길찾기 · 경로 미리보기", 7)
                action("다른 장소 선택", 3)
            }
            7 -> {
                heading("추천 경로")
                detail("8.2 km · 약 19분 · 모의 경로/교통 정보")
                action("모의 길안내 시작", 8)
                action("경로 변경 알림 테스트", 9)
            }
        }
        qaPanel = panel
        qaRoot.addView(panel, android.widget.FrameLayout.LayoutParams(-1, -2, Gravity.CENTER).apply {
            setMargins(dp(22), 0, dp(22), dp(5))
        })
    }

    private fun showStatus(message: String) {
        status.text = message
        status.visibility = View.VISIBLE
    }

    override fun onBackPressed() {
        if (drawerOpen) closeDrawer()
        else super.onBackPressed()
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
            authenticateAndBindMap()
        } else {
            showStatus("현재 위치 권한이 없어 카카오 SDK 지도를 실행할 수 없습니다. 설정에서 위치 접근을 허용해 주세요.")
        }
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
        status.visibility = View.VISIBLE
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
                    mapView.moveCamera(KNMapCameraUpdate.targetTo(FloatPoint(startPoint.x.toFloat(), startPoint.y.toFloat())), false)
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
        stopButton.visibility = View.VISIBLE
        guidanceStarted = true
        guidance.startWithTrip(trip, priority, 0)
    }

    override fun guidanceCheckingRouteChange(guidance: KNGuidance) {
        turnTitle.text = "경로를 다시 확인하고 있습니다."
        showStatus("경로가 변경되어 다시 계산합니다.")
    }

    override fun guidanceDidUpdateRoutes(guidance: KNGuidance, routes: List<KNRoute>, multiRouteInfo: KNMultiRouteInfo?) {
        currentRoute = routes.firstOrNull()
        mapView.setRoutes(routes)
        guidance.locationGuide?.locationForPrimaryRoute?.let(::updateRemainingSummary)
            ?: currentRoute?.let(::showFullRouteSummary)
    }

    override fun guidanceDidUpdateIndoorRoute(guidance: KNGuidance, route: KNRoute?) {
        route?.let { mapView.setRoute(it) }
    }

    override fun guidanceGuideEnded(guidance: KNGuidance) {
        showPostDriveScreen(arrived = true)
    }

    override fun guidanceGuideStarted(guidance: KNGuidance) {
        guidanceStarted = true
        turnTitle.text = "안내를 시작합니다."
        turnDistance.text = destinationName
    }

    override fun guidanceOutOfRoute(guidance: KNGuidance) {
        turnTitle.text = "경로를 벗어나 다시 안내합니다."
        showStatus("경로 이탈 · 안전한 경로를 다시 확인하고 있습니다.")
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
        showFullRouteSummary(toRoute)
    }

    override fun guidanceRouteUnchanged(guidance: KNGuidance) = Unit

    override fun guidanceRouteUnchangedWithError(guidance: KNGuidance, error: KNError) {
        turnTitle.text = "경로를 유지하고 있습니다."
    }

    override fun guidanceDidUpdateLocation(guidance: KNGuidance, locationGuide: KNGuide_Location) {
        val location = locationGuide.locationForPrimaryRoute ?: locationGuide.location ?: return
        mapView.moveCamera(KNMapCameraUpdate.targetTo(FloatPoint(location.pos.x.toFloat(), location.pos.y.toFloat())), true)
        mapView.cullPassedRoute(location, true)
        updateRemainingSummary(location)
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
        if (!voiceMuted) playVoiceGuide(voiceGuide)
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

    private fun showPostDriveScreen(arrived: Boolean = false) {
        if (guidanceEnded) return
        guidanceEnded = true
        pendingLocationListener?.let { locationManager?.removeUpdates(it) }
        pendingLocationListener = null
        voicePlayer?.runCatching { stop() }
        voicePlayer?.release()
        voicePlayer = null

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(247, 250, 249))
        }
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(22), dp(18), dp(22), dp(18))
            setBackgroundColor(Color.rgb(17, 61, 77))
        }
        header.addView(TextView(this).apply {
            text = "여행갈지도"
            textSize = 14f
            setTextColor(Color.rgb(196, 229, 224))
        })
        header.addView(TextView(this).apply {
            text = if (arrived) "목적지에 도착했어요" else "운행을 마쳤어요"
            textSize = 24f
            setTextColor(Color.WHITE)
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setPadding(0, dp(5), 0, dp(3))
        })
        header.addView(TextView(this).apply {
            text = destinationName
            textSize = 15f
            setTextColor(Color.rgb(218, 238, 237))
        })
        root.addView(header, LinearLayout.LayoutParams(-1, -2))

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(14), dp(18), dp(18))
        }
        content.addView(TextView(this).apply {
            text = "여행갈지도 여행 혜택"
            textSize = 21f
            setTextColor(Color.rgb(17, 61, 77))
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        })
        content.addView(TextView(this).apply {
            text = "주행 안내가 끝났습니다. 관광지와 숙소를 둘러보고, 등록된 쿠폰을 확인해 보세요."
            textSize = 14f
            setTextColor(Color.rgb(68, 91, 96))
            setPadding(0, dp(6), 0, dp(12))
        })

        val categories = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        addCategoryButton(categories, "관광지", "둘러보기", "https://yeohang.lexid.site/places")
        addCategoryButton(categories, "숙박", "주변 숙소", "https://yeohang.lexid.site/#map")
        content.addView(categories, LinearLayout.LayoutParams(-1, -2))
        val food = Button(this).apply {
            text = "식당 찾기 · 카카오맵"
            setOnClickListener { openBrowseUrl("https://map.kakao.com/link/search/${Uri.encode(destinationName + " 맛집")}") }
        }
        content.addView(food, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(6) })

        content.addView(TextView(this).apply {
            text = "사용 가능한 숙박 쿠폰"
            textSize = 18f
            setTextColor(Color.rgb(17, 61, 77))
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setPadding(0, dp(18), 0, dp(8))
        })
        val couponList = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        couponList.addView(TextView(this).apply {
            text = "승인된 쿠폰을 확인하고 있어요."
            textSize = 14f
            setTextColor(Color.rgb(68, 91, 96))
        })
        content.addView(couponList, LinearLayout.LayoutParams(-1, -2))
        loadApprovedCoupons(couponList)

        content.addView(Button(this).apply {
            text = "전체 여행 혜택 보기"
            setOnClickListener { openBrowseUrl("https://yeohang.lexid.site/events") }
        }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(8) })
        content.addView(Button(this).apply {
            text = "지도 화면으로 돌아가기"
            setOnClickListener { finish() }
        }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(6) })

        val scroll = ScrollView(this).apply { addView(content) }
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)
    }

    private fun addCategoryButton(parent: LinearLayout, title: String, subtitle: String, url: String) {
        val button = Button(this).apply {
            text = "$title\n$subtitle"
            setOnClickListener { openBrowseUrl(url) }
        }
        parent.addView(button, LinearLayout.LayoutParams(0, dp(72), 1f).apply {
            if (parent.childCount > 0) marginStart = dp(8)
        })
    }

    private fun openBrowseUrl(url: String) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE))
        } catch (_: Exception) {
            Toast.makeText(this, "혜택 페이지를 열지 못했습니다.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun loadApprovedCoupons(container: LinearLayout) {
        Thread {
            val coupons = runCatching {
                val connection = (URL("https://yeohang.lexid.site/api/coupons").openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 4000
                    readTimeout = 4000
                }
                try {
                    if (connection.responseCode !in 200..299) return@runCatching emptyList<String>()
                    val body = connection.inputStream.bufferedReader().use { it.readText() }
                    val rows = JSONObject(body).optJSONArray("coupons") ?: return@runCatching emptyList<String>()
                    (0 until rows.length()).mapNotNull { index ->
                        val row = rows.optJSONObject(index) ?: return@mapNotNull null
                        val name = row.optString("property_name").trim()
                        val discount = row.optInt("discount_pct", 0)
                        if (name.isBlank() || discount !in 1..100) null else "$name · ${discount}% 할인"
                    }.take(3)
                } finally {
                    connection.disconnect()
                }
            }.getOrDefault(emptyList())
            runOnUiThread {
                if (isFinishing || isDestroyed) return@runOnUiThread
                container.removeAllViews()
                val messages = if (coupons.isEmpty()) listOf("현재 확인할 수 있는 승인 쿠폰이 없습니다.") else coupons
                messages.forEach { text ->
                    container.addView(TextView(this).apply {
                        this.text = text
                        textSize = 14f
                        setTextColor(Color.rgb(45, 78, 77))
                        setPadding(dp(12), dp(10), dp(12), dp(10))
                        background = android.graphics.drawable.GradientDrawable().apply {
                            cornerRadius = dp(12).toFloat()
                            setColor(Color.WHITE)
                        }
                    }, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(6) })
                }
            }
        }.start()
    }

    private fun formatDistance(meters: Int): String =
        if (meters >= 1000) String.format("%.1f km", meters / 1000.0) else "$meters m"

    private fun showFullRouteSummary(route: KNRoute) {
        routeSummary.text = "${formatDistance(route.totalDist)} · 약 ${formatDuration(route.totalTime)}"
    }

    private fun updateRemainingSummary(location: KNLocation) {
        val route = currentRoute ?: return
        val remainingMeters = (route.totalDist - location.distFromS).coerceAtLeast(0)
        val remainingSeconds = if (route.totalDist > 0) {
            (route.totalTime.toLong() * remainingMeters / route.totalDist).toInt()
        } else route.totalTime
        routeSummary.text = "${formatDistance(remainingMeters)} 남음 · 약 ${formatDuration(remainingSeconds)}"
    }

    private fun formatDuration(seconds: Int): String {
        val minutes = (seconds / 60).coerceAtLeast(1)
        return if (minutes >= 60) "${minutes / 60}시간 ${minutes % 60}분" else "${minutes}분"
    }

    override fun onDestroy() {
        pendingLocationListener?.let { locationManager?.removeUpdates(it) }
        if (guidanceStarted && !guidanceEnded) YeohangApplication.sdk.sharedGuidance()?.stop()
        voicePlayer?.runCatching { stop() }
        voicePlayer?.release()
        voicePlayer = null
        super.onDestroy()
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density + 0.5f).toInt()
}
