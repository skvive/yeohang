package site.lexid.yeohangnav;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/**
 * V9 branded map shell. This is a secure WebView/PWA wrapper, NOT an in-app navigation SDK.
 * The authoritative place search remains the yeohang backend; roads/maps require connectivity.
 */
public final class MainActivity extends Activity {
    private static final String HOME = "https://yeohang.lexid.site/#map";
    private static final String APP_HOST = "yeohang.lexid.site";
    private static final int LOCATION_REQUEST = 2309;
    private WebView webView;
    private GeolocationPermissions.Callback pendingGeo;
    private String pendingOrigin;
    private TextView status;
    private boolean pageFinished;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(19, 57, 73));
        getWindow().setNavigationBarColor(Color.WHITE);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(247, 250, 247));
        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setMediaPlaybackRequiresUserGesture(true);
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
            @Override public void onPageFinished(WebView v, String url) {
                pageFinished = true;
                injectNavigationOverlay();
                status.setVisibility(View.GONE);
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest req,
                    android.webkit.WebResourceError error) {
                if(req.isForMainFrame()) {
                    pageFinished = false;
                    status.setText("인터넷 연결을 확인해 주세요.\n화면을 탭하면 다시 연결합니다.");
                    status.setVisibility(View.VISIBLE);
                }
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onGeolocationPermissionsShowPrompt(
                    String origin, GeolocationPermissions.Callback callback) {
                // Never grant location to a third-party iframe, ad or external website.
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
        status = new TextView(this);
        status.setText("✦  여행갈지도\n지도를 연결하고 있습니다…");
        status.setTextSize(17);
        status.setTextColor(Color.rgb(21, 67, 80));
        status.setGravity(Gravity.CENTER);
        status.setOnClickListener(v -> {
            if (!pageFinished) { status.setText("지도를 다시 연결하고 있습니다…"); webView.loadUrl(HOME); }
        });
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        root.addView(status, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        webView.loadUrl(HOME);
    }

    // Inject only bundled, first-party UI files into the allowlisted first-party domain.
    // No JS-to-native interface and no remote script download.
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
                    if (webView != null) webView.evaluateJavascript(js, null);
                });
        } catch (Exception ignored) {
            // A failed overlay must not prevent the existing website from loading.
        }
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
            if("kakaomap".equalsIgnoreCase(uri.getScheme())) {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://map.kakao.com")));
            }
        }
    }

    @Override public void onBackPressed() {
        if(webView != null && webView.canGoBack()) webView.goBack();
        else if(webView != null && !HOME.equals(webView.getUrl())) webView.loadUrl(HOME);
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if(pendingGeo != null) { pendingGeo.invoke(pendingOrigin, false, false); pendingGeo=null; }
        if(webView != null) { webView.destroy(); webView=null; }
        super.onDestroy();
    }
}
