package site.lexid.yeohanglab;
import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Test-only minimal APK. Not the user's Yeohaeng Android v8 app. */
public class MainActivity extends Activity {
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    LinearLayout view = new LinearLayout(this);
    view.setOrientation(LinearLayout.VERTICAL);
    view.setGravity(Gravity.CENTER);
    view.setPadding(24,24,24,24);
    view.setBackgroundColor(Color.rgb(255,248,230));
    TextView title = new TextView(this);
    title.setText("여행갈지도 Android 테스트 환경");
    title.setTextColor(Color.rgb(12,88,93));
    title.setTextSize(22);
    title.setGravity(Gravity.CENTER);
    view.addView(title);
    TextView message = new TextView(this);
    message.setText("이 화면은 Android SDK / Gradle / ADB / 에뮬레이터 검증용 앱입니다.\n실제 여행갈지도 v8 앱은 아닙니다.");
    message.setTextSize(14);
    message.setGravity(Gravity.CENTER);
    view.addView(message);
    setContentView(view);
  }
}
