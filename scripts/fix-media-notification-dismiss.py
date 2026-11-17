from pathlib import Path
import re

# ----- MainActivity: لا تُعد الإشعار بعد حذفه يدوياً حتى التشغيل -----
p = Path("android-app/android/app/src/main/java/com/aya/alquran/MainActivity.java")
if not p.exists():
    raise SystemExit("MainActivity.java not found")
text = p.read_text(encoding="utf-8")

if "mediaNotifDismissedByUser" not in text:
    text = text.replace(
        "private boolean mediaServiceActive = false;",
        "private boolean mediaServiceActive = false;\n    private boolean mediaNotifDismissedByUser = false;",
        1,
    )

if "markMediaNotifDismissed" not in text:
    text = text.replace(
        "private void hideMediaNotification() {",
        "public void markMediaNotifDismissed() {\n        mediaNotifDismissedByUser = true;\n        mediaServiceActive = false;\n        isPlaying = false;\n    }\n\n    private void hideMediaNotification() {",
        1,
    )

old = (
    'if ("media-play".equals(cmd)) showMediaNotification(t, a, true);\n'
    '                    else if ("media-pause".equals(cmd)) showMediaNotification(t, a, false);\n'
    '                    else if ("media-update".equals(cmd)) showMediaNotification(t, a, p);\n'
    '                    else if ("media-stop".equals(cmd) || "media-hide".equals(cmd)) hideMediaNotification();'
)
new = (
    'if ("media-play".equals(cmd)) {\n'
    '                        mediaNotifDismissedByUser = false;\n'
    '                        showMediaNotification(t, a, true);\n'
    '                    } else if ("media-pause".equals(cmd)) {\n'
    '                        if (!mediaNotifDismissedByUser) showMediaNotification(t, a, false);\n'
    '                    } else if ("media-update".equals(cmd)) {\n'
    '                        boolean clear = data != null && data.optBoolean("clear", false);\n'
    '                        if (clear) hideMediaNotification();\n'
    '                        else if (!mediaNotifDismissedByUser) showMediaNotification(t, a, p);\n'
    '                    } else if ("media-stop".equals(cmd) || "media-hide".equals(cmd) || "media-clear".equals(cmd)) {\n'
    '                        hideMediaNotification();\n'
    '                    } else if ("media-dismissed".equals(cmd)) {\n'
    '                        mediaNotifDismissedByUser = true;\n'
    '                        mediaServiceActive = false;\n'
    '                    }'
)
# also handle already-patched hide-on-pause variant
old_hide = (
    'if ("media-play".equals(cmd)) {\n'
    '                        showMediaNotification(t, a, true);\n'
    '                    } else if ("media-pause".equals(cmd)\n'
    '                            || "media-stop".equals(cmd)\n'
    '                            || "media-hide".equals(cmd)\n'
    '                            || "media-clear".equals(cmd)) {\n'
    '                        hideMediaNotification();\n'
    '                    } else if ("media-update".equals(cmd)) {\n'
    '                        boolean clear = data != null && data.optBoolean("clear", false);\n'
    '                        if (clear || !p) hideMediaNotification();\n'
    '                        else showMediaNotification(t, a, true);\n'
    '                    }'
)
if old in text:
    text = text.replace(old, new, 1)
    print("OK: MainActivity original block patched")
elif old_hide in text:
    text = text.replace(old_hide, new, 1)
    print("OK: MainActivity hide-on-pause block replaced")
elif "mediaNotifDismissedByUser = false" in text and 'if (!mediaNotifDismissedByUser) showMediaNotification' in text:
    print("OK: MainActivity already has dismiss logic")
else:
    print("WARN: MainActivity media block not matched")

p.write_text(text, encoding="utf-8")

# ----- AyaMediaService: DeleteIntent عند سحب الإشعار -----
sp = Path("android-app/android/app/src/main/java/com/aya/alquran/AyaMediaService.java")
if sp.exists():
    st = sp.read_text(encoding="utf-8")
    if "ACTION_NOTIF_DISMISSED" not in st:
        # add action constant near other ACTION_
        st2 = st
        if "ACTION_SYNC" in st2 and "ACTION_NOTIF_DISMISSED" not in st2:
            st2 = st2.replace(
                "public static final String ACTION_SYNC",
                'public static final String ACTION_NOTIF_DISMISSED = "com.aya.alquran.ACTION_MEDIA_NOTIF_DISMISSED";\n    public static final String ACTION_SYNC',
                1,
            )
        # handle action in onStartCommand - look for ACTION_SYNC handling
        if "ACTION_NOTIF_DISMISSED" in st2 and "markMediaNotifDismissed" not in st2:
            hook = (
                "        if (ACTION_NOTIF_DISMISSED.equals(intent != null ? intent.getAction() : null)) {\n"
                "            try {\n"
                "                MainActivity act = MainActivity.getInstance();\n"
                "                if (act != null) act.markMediaNotifDismissed();\n"
                "            } catch (Exception ignored) {}\n"
                "            stopForeground(true);\n"
                "            stopSelf();\n"
                "            return START_NOT_STICKY;\n"
                "        }\n"
            )
            # insert at start of onStartCommand body after super or after first brace content
            m = re.search(r"public int onStartCommand\(Intent intent, int flags, int startId\)\s*\{", st2)
            if m:
                pos = m.end()
                st2 = st2[:pos] + "\n" + hook + st2[pos:]
        # setDeleteIntent on builder
        if "setDeleteIntent" not in st2:
            needle = ".setOngoing(playing)"
            if needle in st2:
                di = (
                    ".setDeleteIntent(PendingIntent.getService(this, 77,\n"
                    "                        new Intent(this, AyaMediaService.class).setAction(ACTION_NOTIF_DISMISSED),\n"
                    "                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE))\n"
                    "                .setOngoing(playing)"
                )
                st2 = st2.replace(needle, di, 1)
        if "PendingIntent" not in st2.split("import ")[0] and "import android.app.PendingIntent" not in st2:
            st2 = st2.replace("import android.app.Notification;", "import android.app.Notification;\nimport android.app.PendingIntent;", 1)
        sp.write_text(st2, encoding="utf-8")
        print("OK: AyaMediaService DeleteIntent added")
    else:
        print("OK: AyaMediaService already has dismiss action")
else:
    print("WARN: AyaMediaService.java not found")
