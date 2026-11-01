package site.lexid.yeohangnav;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.net.http.SslError;
import android.webkit.SslErrorHandler;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/**
 * Navigation V9: first-party WebView + independently-rendered native offline state.
 * This is not Kakao Maps Navigation SDK or a locally cached road map.
 */
public final class MainActivity extends Activity {
    private static final String TAG = "YeohangNav";
    private static final String HOME = "https://yeohang.lexid.site/#map";
    private static final String APP_HOST = "yeohang.lexid.site";
    private static final int LOCATION_REQUEST = 2309;
    private WebView webView;
    private GeolocationPermissions.Callback pendingGeo;
    private String pendingOrigin;
    private LinearLayout statusPanel;
    private TextView statusHeadline;
    private TextView statusDetail;
    private Button retryButton;
    private boolean pageFinished;
    private boolean pageFailed;

    private int dp(int value) { return (int)(value * getResources().getDisplayMetrics().density + .5f); }

    private GradientDrawable rounded(int color, int radius) {
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(color);
        shape.setCornerRadius(dp(radius));
        return shape;
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(19, 57, 73));
        getWindow().setNavigationBarColor(Color.WHITE);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(255, 250, 240));
        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);
        webView.setVisibility(View.INVISIBLE);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri == null) return true;
                String scheme = uri.getScheme();
                if ("https".equalsIgnoreCase(scheme) &&
                        APP_HOST.equalsIgnoreCase(uri.getHost())) return false;
                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme) ||
                    "mailto".equalsIgnoreCase(scheme) || "tel".equalsIgnoreCase(scheme) ||
                    "kakaomap".equalsIgnoreCase(scheme)) {
                    openOutside(uri);
                }
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                pageFinished = false;
                pageFailed = false;
                if (url != null && url.startsWith("https://" + APP_HOST)) {
                    showNativeState(false, "길별이와 지도를 연결하고 있어요",
                        "연결 상태를 확인한 후 주변 숙소를 불러옵니다.");
                    webView.setVisibility(View.INVISIBLE);
                }
            }
            @Override public void onPageFinished(WebView view, String url) {
                if(pageFailed) return; // WebView still fires onPageFinished for its built-in DNS error page.
                if(url == null || !url.startsWith("https://" + APP_HOST)) return;
                pageFinished = true;
                injectNavigationOverlay();
                webView.setVisibility(View.VISIBLE);
                statusPanel.setVisibility(View.GONE);
                Log.i(TAG, "NAV_PAGE_READY URL=first_party");
                verifyMapSurfaceLater();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    failNativeState("NAV_PAGE_FAILED", "인터넷 연결을 확인해 주세요.",
                        "네트워크 또는 도메인 연결에 실패했습니다. 연결 후 다시 시도해 주세요.");
                }
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
                failNativeState("NAV_TLS_ERROR", "안전한 연결을 설정하지 못했어요.",
                    "보안 연결 문제로 지도를 열지 않았습니다. 네트워크 상태를 확인해 주세요.");
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                if (request.isForMainFrame() && errorResponse != null &&
                    errorResponse.getStatusCode() >= 400) {
                    failNativeState("NAV_HTTP_ERROR", "서비스에 잠시 연결할 수 없어요.",
                        "서버 응답을 확인해 주세요. 잠시 후 다시 연결할 수 있습니다.");
                }
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onGeolocationPermissionsShowPrompt(
                    String origin, GeolocationPermissions.Callback callback) {
                Uri uri = Uri.parse(origin);
                if (!"https".equalsIgnoreCase(uri.getScheme()) ||
                    !APP_HOST.equalsIgnoreCase(uri.getHost())) {
                    callback.invoke(origin, false, false);
                    return;
                }
                if (hasLocation()) callback.invoke(origin, true, false);
                else {
                    pendingGeo = callback;
                    pendingOrigin = origin;
                    requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION}, LOCATION_REQUEST);
                }
            }
        });
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        buildNativeState(root);
        setContentView(root);
        webView.loadUrl(HOME);
    }

    private TextView makeText(String text, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setGravity(Gravity.CENTER);
        view.setTextColor(color);
        view.setTextSize(size);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }

    private void buildNativeState(FrameLayout root) {
        statusPanel = new LinearLayout(this);
        statusPanel.setOrientation(LinearLayout.VERTICAL);
        statusPanel.setGravity(Gravity.CENTER);
        statusPanel.setPadding(dp(24), dp(36), dp(24), dp(36));
        statusPanel.setBackgroundColor(Color.rgb(255, 250, 240));

        TextView eyebrow = makeText("KIM BYEOL'S TRAVEL ATLAS", 11, Color.rgb(18, 114, 111), true);
        statusPanel.addView(eyebrow, new LinearLayout.LayoutParams(-1, dp(25)));

        ImageView mascot = new ImageView(this);
        mascot.setContentDescription("여행갈지도 지도도령 캐릭터");
        try (InputStream input = getAssets().open("assets/mascot-jido.webp")) {
            Bitmap bitmap = BitmapFactory.decodeStream(input);
            if (bitmap != null) mascot.setImageBitmap(bitmap);
        } catch (Exception ignored) {}
        mascot.setScaleType(ImageView.ScaleType.FIT_CENTER);
        LinearLayout.LayoutParams imgParam = new LinearLayout.LayoutParams(dp(170), dp(194));
        imgParam.gravity = Gravity.CENTER;
        imgParam.topMargin = dp(12);
        statusPanel.addView(mascot, imgParam);

        TextView title = makeText("여행갈지도", 33, Color.rgb(18, 55, 73), true);
        statusPanel.addView(title, new LinearLayout.LayoutParams(-1, dp(57)));
        TextView subtitle = makeText("김별과 길별이가 함께하는 대한민국 여행지도", 13,
            Color.rgb(69, 104, 108), false);
        statusPanel.addView(subtitle, new LinearLayout.LayoutParams(-1, dp(43)));

        statusHeadline = makeText("", 20, Color.rgb(18, 55, 73), true);
        LinearLayout.LayoutParams h = new LinearLayout.LayoutParams(-1, dp(72));
        h.topMargin = dp(24);
        statusPanel.addView(statusHeadline, h);

        statusDetail = makeText("", 14, Color.rgb(79, 103, 108), false);
        statusDetail.setLineSpacing(dp(3), 1f);
        statusPanel.addView(statusDetail, new LinearLayout.LayoutParams(-1, dp(72)));

        retryButton = new Button(this);
        retryButton.setText("↻  지도 다시 연결");
        retryButton.setAllCaps(false);
        retryButton.setTextSize(15);
        retryButton.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        retryButton.setTextColor(Color.WHITE);
        retryButton.setBackground(rounded(Color.rgb(10, 126, 123), 16));
        retryButton.setOnClickListener(v -> {
            Log.i(TAG, "NAV_RETRY");
            showNativeState(false, "지도를 다시 연결하고 있어요",
                "네트워크 연결과 지도 서비스 응답을 확인합니다.");
            webView.loadUrl(HOME);
        });
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(-1, dp(58));
        buttonParams.topMargin = dp(15);
        buttonParams.leftMargin = dp(18);
        buttonParams.rightMargin = dp(18);
        statusPanel.addView(retryButton, buttonParams);

        TextView caption = makeText("기본 탐색 위치: 가락시장역 · 실제 위치가 아닙니다\n위치정보는 동의 없이 사용하지 않습니다.", 11,
            Color.rgb(95, 125, 124), false);
        LinearLayout.LayoutParams cap = new LinearLayout.LayoutParams(-1, dp(63));
        cap.topMargin = dp(25);
        statusPanel.addView(caption, cap);
        root.addView(statusPanel, new FrameLayout.LayoutParams(-1, -1));
        showNativeState(false, "길별이와 지도를 연결하고 있어요",
            "연결 상태를 확인한 후 주변 숙소를 불러옵니다.");
    }

    private void showNativeState(boolean failed, String headline, String description) {
        if (statusPanel == null) return;
        statusHeadline.setText(headline);
        statusDetail.setText(description);
        retryButton.setVisibility(failed ? View.VISIBLE : View.GONE);
        statusPanel.setVisibility(View.VISIBLE);
        if (webView != null) webView.setVisibility(View.INVISIBLE);
    }

    private void failNativeState(String reason, String headline, String description) {
        pageFailed = true;
        pageFinished = false;
        Log.w(TAG, reason);
        showNativeState(true, headline, description);
    }

    // Overlay first-party UI files only on the allowlisted first-party HTTPS domain.
    private String readAsset(String fileName) throws Exception {
        try (InputStream input = getAssets().open(fileName);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] block = new byte[8192];
            int count;
            while ((count = input.read(block)) != -1) output.write(block, 0, count);
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }
    private void injectNavigationOverlay() {
        if (webView == null || webView.getUrl() == null) return;
        Uri loaded = Uri.parse(webView.getUrl());
        if (!"https".equalsIgnoreCase(loaded.getScheme()) ||
            !APP_HOST.equalsIgnoreCase(loaded.getHost())) return;
        try {
            String css = readAsset("navigation-v9.css");
            String js = readAsset("navigation-v9.js");
            webView.evaluateJavascript("(function(){if(window.__YV9_APK__)return;" +
                "window.__YV9_APK__=true;" +
                "var s=document.createElement('style');s.textContent=" + JSONObject.quote(css) +
                ";document.head.appendChild(s);})();", ignored -> {
                    if (webView != null && !pageFailed) webView.evaluateJavascript(js, null);
                });
        } catch (Exception error) {
            Log.w(TAG, "NAV_BRAND_OVERLAY_FAILED");
        }
    }

    // This signal verifies the app page rendered the map controls; it is NOT proof of live road routing.
    private void verifyMapSurfaceLater() {
        if (webView == null) return;
        webView.postDelayed(() -> {
            if (pageFailed || webView == null) return;
            String expression = "(function(){return !!document.getElementById('mapCanvas')" +
                "&&!!document.getElementById('mapSide')" +
                "&&!!document.querySelector('[data-mapcategory]');})()";
            webView.evaluateJavascript(expression, value -> {
                if ("true".equals(value)) Log.i(TAG, "NAV_MAP_SURFACE_READY");
                else Log.w(TAG, "NAV_MAP_SURFACE_UNVERIFIED");
            });
        }, 7000);
    }

    private boolean hasLocation() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grants) {
        super.onRequestPermissionsResult(requestCode, permissions, grants);
        if(requestCode == LOCATION_REQUEST && pendingGeo != null) {
            pendingGeo.invoke(pendingOrigin, hasLocation(), false);
            pendingGeo = null;
            pendingOrigin = null;
        }
    }

    private void openOutside(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE));
        } catch (ActivityNotFoundException ex) {
            if ("kakaomap".equalsIgnoreCase(uri.getScheme())) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://map.kakao.com"))); }
                catch (ActivityNotFoundException ignored) {}
            }
        }
    }

    @Override public void onBackPressed() {
        if (pageFailed) { webView.loadUrl(HOME); return; }
        if (webView != null && webView.canGoBack()) webView.goBack();
        else if (webView != null && !HOME.equals(webView.getUrl())) webView.loadUrl(HOME);
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if(pendingGeo != null) { pendingGeo.invoke(pendingOrigin, false, false); pendingGeo=null; }
        if(webView != null) { webView.destroy(); webView=null; }
        super.onDestroy();
    }
}
