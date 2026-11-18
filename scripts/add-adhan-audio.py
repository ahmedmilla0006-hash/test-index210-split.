from pathlib import Path
import shutil

ROOT = Path("android-app/android/app/src/main")
JAVA = ROOT / "java/com/aya/alquran"
SRC = Path("app-source/assets/adhan-default.mp3")
if not SRC.is_file():
    raise SystemExit("Missing app-source/assets/adhan-default.mp3")

raw = ROOT / "res/raw"
raw.mkdir(parents=True, exist_ok=True)
shutil.copy2(SRC, raw / "adhan_default.mp3")

receiver = JAVA / "AyaAdhanReceiver.java"
if not receiver.is_file():
    raise SystemExit("AyaAdhanReceiver.java was not generated before the audio patch")

receiver.write_text(r'''package com.aya.alquran;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class AyaAdhanReceiver extends BroadcastReceiver {
    static final String DEFAULT_CHANNEL = "aya_adhan_alerts_v12";
    static final String PREF_SOUND_URI = "aya_adhan_sound_uri";
    static final String PREF_SOUND_CHANNEL = "aya_adhan_sound_channel";

    static Uri soundUri(Context context) {
        String saved = context.getSharedPreferences(AyaAdhanScheduler.PREFS, Context.MODE_PRIVATE)
            .getString(PREF_SOUND_URI, null);
        if (saved != null && !saved.isEmpty()) {
            try { return Uri.parse(saved); } catch (Exception ignored) {}
        }
        return Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.adhan_default);
    }

    static String channelId(Context context) {
        return context.getSharedPreferences(AyaAdhanScheduler.PREFS, Context.MODE_PRIVATE)
            .getString(PREF_SOUND_CHANNEL, DEFAULT_CHANNEL);
    }

    static void ensureChannel(Context context) {
        NotificationManager manager = (NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        ensureChannel(context, manager);
    }

    static void ensureChannel(Context context, NotificationManager manager) {
        if (Build.VERSION.SDK_INT < 26 || manager == null) return;
        String id = channelId(context);
        if (manager.getNotificationChannel(id) != null) return;
        NotificationChannel channel = new NotificationChannel(
            id, "تنبيهات الأذان", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("تنبيه وقت الصلاة بالنغمة التي اختارها المستخدم");
        channel.setSound(soundUri(context), new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build());
        manager.createNotificationChannel(channel);
    }

    @Override public void onReceive(Context context, Intent intent) {
        String key = intent.getStringExtra(AyaAdhanScheduler.EXTRA_KEY);
        String name = intent.getStringExtra(AyaAdhanScheduler.EXTRA_NAME);
        long when = intent.getLongExtra(AyaAdhanScheduler.EXTRA_TIME, 0L);
        if (key == null || name == null) return;
        if (!context.getSharedPreferences(AyaAdhanScheduler.PREFS, Context.MODE_PRIVATE)
                .getBoolean(key, false)) return;

        NotificationManager manager = (NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        ensureChannel(context, manager);
        Uri sound = soundUri(context);
        String channel = channelId(context);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_stat_aya)
            .setContentTitle("حان الآن وقت صلاة " + name)
            .setContentText("حيّ على الصلاة")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true);
        if (Build.VERSION.SDK_INT < 26) builder.setSound(sound);

        try {
            NotificationManagerCompat.from(context).notify(
                8500 + Math.abs(key.hashCode() % 500), builder.build());
        } catch (SecurityException ignored) {}
        AyaAdhanScheduler.scheduleNextDay(context, key, name, when);
    }
}
''', encoding="utf-8")

bridge = JAVA / "AyaAdhanBridge.java"
if not bridge.is_file():
    raise SystemExit("AyaAdhanBridge.java was not generated before the audio patch")
b = bridge.read_text(encoding="utf-8")
if "saveSound(String name, String encoded)" not in b:
    imports = """import android.content.ContentValues;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
"""
    anchor = "import android.webkit.JavascriptInterface;"
    if anchor not in b:
        raise SystemExit("Cannot find imports anchor in AyaAdhanBridge.java")
    b = b.replace(anchor, imports + anchor, 1)
    methods = r'''
    @JavascriptInterface public boolean saveSound(String name, String encoded) {
        if (encoded == null || encoded.isEmpty()) return false;
        Uri created = null;
        try {
            byte[] data = Base64.decode(encoded, Base64.DEFAULT);
            if (data.length == 0 || data.length > 12 * 1024 * 1024) return false;
            String safe = (name == null ? "adhan.mp3" : name).replaceAll("[^A-Za-z0-9._-]", "_");
            if (safe.length() > 70) safe = safe.substring(safe.length() - 70);
            String mime = safe.toLowerCase().endsWith(".wav") ? "audio/wav" :
                (safe.toLowerCase().endsWith(".m4a") ? "audio/mp4" : "audio/mpeg");

            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, "Aya_" + safe);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_NOTIFICATIONS + "/Aya");
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                created = activity.getContentResolver().insert(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, values);
                if (created == null) return false;
                try (OutputStream out = activity.getContentResolver().openOutputStream(created)) {
                    if (out == null) throw new IllegalStateException("Cannot open saved audio");
                    out.write(data);
                    out.flush();
                }
                ContentValues ready = new ContentValues();
                ready.put(MediaStore.MediaColumns.IS_PENDING, 0);
                activity.getContentResolver().update(created, ready, null, null);
            } else {
                File folder = new File(activity.getExternalFilesDir(Environment.DIRECTORY_NOTIFICATIONS), "Aya");
                if (!folder.exists() && !folder.mkdirs()) return false;
                File file = new File(folder, "adhan_custom_" + System.currentTimeMillis() + "_" + safe);
                try (FileOutputStream out = new FileOutputStream(file)) {
                    out.write(data);
                    out.flush();
                }
                created = Uri.fromFile(file);
            }

            String uri = created.toString();
            String channel = "aya_adhan_custom_" + Integer.toHexString(uri.hashCode());
            activity.getSharedPreferences(AyaAdhanScheduler.PREFS, Context.MODE_PRIVATE)
                .edit().putString(AyaAdhanReceiver.PREF_SOUND_URI, uri)
                .putString(AyaAdhanReceiver.PREF_SOUND_CHANNEL, channel).apply();
            return true;
        } catch (Exception error) {
            if (created != null && Build.VERSION.SDK_INT >= 29) {
                try { activity.getContentResolver().delete(created, null, null); } catch (Exception ignored) {}
            }
            return false;
        }
    }

    @JavascriptInterface public boolean useDefaultSound() {
        try {
            activity.getSharedPreferences(AyaAdhanScheduler.PREFS, Context.MODE_PRIVATE).edit()
                .remove(AyaAdhanReceiver.PREF_SOUND_URI)
                .putString(AyaAdhanReceiver.PREF_SOUND_CHANNEL, AyaAdhanReceiver.DEFAULT_CHANNEL)
                .apply();
            return true;
        } catch (Exception ignored) { return false; }
    }
'''
    pos = b.rfind("}")
    if pos < 0:
        raise SystemExit("AyaAdhanBridge class closing brace not found")
    b = b[:pos] + methods + "\n" + b[pos:]
    bridge.write_text(b, encoding="utf-8")

# Remove the obsolete white button that opened Android's channel settings.
js_candidates = [
    Path("app-source/js/32-aya-prayer-times.js"),
    Path("js/32-aya-prayer-times.js"),
]
for js in js_candidates:
    if not js.is_file():
        continue
    text = js.read_text(encoding="utf-8")
    text = text.replace(
        '<div class="aya-adhan-options" id="ayaAdhanOptions"></div><button type="button" id="ayaAdhanSoundSettings" class="aya-prayer-toggle" style="width:100%;margin-top:10px">🎵 اختيار نغمة الأذان</button><div class="aya-adhan-note" id="ayaAdhanNote">',
        '<div class="aya-adhan-options" id="ayaAdhanOptions"></div><div class="aya-adhan-note" id="ayaAdhanNote">'
    )
    start = text.find("  document.addEventListener('click',e=>{\n    if(e.target.closest('#ayaAdhanSoundSettings'))")
    if start >= 0:
        end = text.find("  });\n", start)
        if end >= 0:
            text = text[:start] + text[end + 5:]
    js.write_text(text, encoding="utf-8")

# Keep the generated web and Android copies identical to the source JS.
source = next((p for p in js_candidates if p.is_file()), None)
if source:
    text = source.read_text(encoding="utf-8")
    for target in [
        Path("android-app/www/js/32-aya-prayer-times.js"),
        Path("android-app/android/app/src/main/assets/public/js/32-aya-prayer-times.js"),
    ]:
        if target.parent.is_dir():
            target.write_text(text, encoding="utf-8")

print("Native Android adhan sound selection and default sound integration installed.")
