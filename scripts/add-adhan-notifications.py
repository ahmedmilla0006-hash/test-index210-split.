from pathlib import Path
import re

root = Path("android-app/android/app/src/main")
java = root / "java/com/aya/alquran"
java.mkdir(parents=True, exist_ok=True)

# Manifest permissions required for scheduled notifications.
manifest = root / "AndroidManifest.xml"
mt = manifest.read_text(encoding="utf-8")
for permission in [
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.RECEIVE_BOOT_COMPLETED",
    "android.permission.SCHEDULE_EXACT_ALARM",
]:
    if f'android:name="{permission}"' not in mt:
        mt = re.sub(r"(<manifest[^>]*>)", r'\1\n    <uses-permission android:name="%s" />' % permission, mt, count=1)

receivers = '''
        <receiver android:name=".AyaAdhanReceiver" android:enabled="true" android:exported="false" />
        <receiver android:name=".AyaAdhanBootReceiver" android:enabled="true" android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>
'''
if ".AyaAdhanReceiver" not in mt:
    mt = mt.replace("</application>", receivers + "\n    </application>")
manifest.write_text(mt, encoding="utf-8")

(java / "AyaAdhanScheduler.java").write_text(r'''package com.aya.alquran;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import java.util.Calendar;

public final class AyaAdhanScheduler {
    static final String PREFS = "aya_adhan_settings";
    static final String EXTRA_KEY = "prayer_key";
    static final String EXTRA_NAME = "prayer_name";
    static final String EXTRA_TIME = "prayer_time";
    private AyaAdhanScheduler() {}

    static int requestCode(String key) { return 8400 + Math.abs(key.hashCode() % 500); }

    static PendingIntent pending(Context c, String key, String name, long when) {
        Intent i = new Intent(c, AyaAdhanReceiver.class);
        i.putExtra(EXTRA_KEY, key);
        i.putExtra(EXTRA_NAME, name);
        i.putExtra(EXTRA_TIME, when);
        return PendingIntent.getBroadcast(c, requestCode(key), i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    public static void schedule(Context c, String key, String name, long when) {
        if (when <= System.currentTimeMillis()) return;
        AlarmManager am = (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = pending(c, key, name, when);
        if (Build.VERSION.SDK_INT >= 31 && am.canScheduleExactAlarms()) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
        } else if (Build.VERSION.SDK_INT >= 23) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
        } else {
            am.setExact(AlarmManager.RTC_WAKEUP, when, pi);
        }
    }

    public static void cancel(Context c, String key, String name) {
        AlarmManager am = (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(pending(c, key, name, 0));
    }

    static void scheduleNextDay(Context c, String key, String name, long previous) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(previous);
        cal.add(Calendar.DAY_OF_YEAR, 1);
        long next = cal.getTimeInMillis();
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong(key + "_next", next).apply();
        schedule(c, key, name, next);
    }
}
''', encoding="utf-8")

(java / "AyaAdhanReceiver.java").write_text(r'''package com.aya.alquran;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class AyaAdhanReceiver extends BroadcastReceiver {
    static final String CHANNEL = "aya_adhan_alerts";
    @Override public void onReceive(Context context, Intent intent) {
        String key = intent.getStringExtra(AyaAdhanScheduler.EXTRA_KEY);
        String name = intent.getStringExtra(AyaAdhanScheduler.EXTRA_NAME);
        long when = intent.getLongExtra(AyaAdhanScheduler.EXTRA_TIME, 0L);
        if (key == null || name == null) return;
        if (!context.getSharedPreferences(AyaAdhanScheduler.PREFS, Context.MODE_PRIVATE)
                .getBoolean(key, false)) return;
        NotificationManager nm = (NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "تنبيهات الأذان", NotificationManager.IMPORTANCE_HIGH));
        }
        NotificationCompat.Builder b = new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_aya)
            .setContentTitle("حان الآن وقت صلاة " + name)
            .setContentText("حيّ على الصلاة")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true);
        try { NotificationManagerCompat.from(context).notify(8500 + Math.abs(key.hashCode() % 500), b.build()); }
        catch (SecurityException ignored) {}
        AyaAdhanScheduler.scheduleNextDay(context, key, name, when);
    }
}
''', encoding="utf-8")

(java / "AyaAdhanBootReceiver.java").write_text(r'''package com.aya.alquran;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import java.util.Calendar;

public class AyaAdhanBootReceiver extends BroadcastReceiver {
    private static final String[][] PRAYERS = {
        {"Fajr","الفجر"},{"Dhuhr","الظهر"},{"Asr","العصر"},{"Maghrib","المغرب"},{"Isha","العشاء"}
    };
    @Override public void onReceive(Context c, Intent i) {
        android.content.SharedPreferences p = c.getSharedPreferences(AyaAdhanScheduler.PREFS, Context.MODE_PRIVATE);
        for (String[] prayer : PRAYERS) {
            if (!p.getBoolean(prayer[0], false)) continue;
            long at = p.getLong(prayer[0] + "_next", 0L);
            if (at <= 0L) continue;
            Calendar cal = Calendar.getInstance();
            cal.setTimeInMillis(at);
            while (cal.getTimeInMillis() <= System.currentTimeMillis()) cal.add(Calendar.DAY_OF_YEAR, 1);
            at = cal.getTimeInMillis();
            p.edit().putLong(prayer[0] + "_next", at).apply();
            AyaAdhanScheduler.schedule(c, prayer[0], prayer[1], at);
        }
    }
}
''', encoding="utf-8")

(java / "AyaAdhanBridge.java").write_text(r'''package com.aya.alquran;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;

public class AyaAdhanBridge {
    private final Activity activity;
    public AyaAdhanBridge(Activity a) { activity = a; }
    @JavascriptInterface public void schedule(String key, String name, long when) {
        if (key == null || name == null) return;
        activity.getSharedPreferences(AyaAdhanScheduler.PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(key, true).putLong(key + "_next", when).apply();
        AyaAdhanScheduler.schedule(activity, key, name, when);
    }
    @JavascriptInterface public void cancel(String key) {
        if (key == null) return;
        activity.getSharedPreferences(AyaAdhanScheduler.PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(key, false).remove(key + "_next").apply();
        AyaAdhanScheduler.cancel(activity, key, "");
    }
    @JavascriptInterface public void requestExactAlarmPermission() {
        if (Build.VERSION.SDK_INT >= 31) {
            android.app.AlarmManager am = (android.app.AlarmManager)activity.getSystemService(Context.ALARM_SERVICE);
            if (am != null && !am.canScheduleExactAlarms()) {
                try {
                    Intent i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                        Uri.parse("package:" + activity.getPackageName()));
                    activity.startActivity(i);
                } catch (Exception ignored) {}
            }
        }
    }
}
''', encoding="utf-8")

# Attach the bridge beside the existing private-audio interface.
# This stable anchor is part of the generated MainActivity.
activity = java / "MainActivity.java"
code = activity.read_text(encoding="utf-8")
anchor = 'getBridge().getWebView().addJavascriptInterface(new AyaPrivateAudioStoreJs(), "AyaPrivateAudioStore");'
injection = 'getBridge().getWebView().addJavascriptInterface(new AyaAdhanBridge(this), "AyaAdhan");'
if injection not in code:
    if anchor not in code:
        raise SystemExit("Cannot find stable WebView bridge injection point in MainActivity.java")
    code = code.replace(anchor, anchor + '\n            ' + injection, 1)
activity.write_text(code, encoding="utf-8")
if injection not in activity.read_text(encoding="utf-8"):
    raise SystemExit("ERROR: AyaAdhan JavaScript bridge was not injected")

print("Native per-prayer adhan scheduling components generated.")
