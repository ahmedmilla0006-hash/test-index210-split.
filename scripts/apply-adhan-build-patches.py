from pathlib import Path
import re, tarfile, io, base64
TAR_B64 = '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'

java = Path("android-app/android/app/src/main/java/com/aya/alquran")
manifest = Path("android-app/android/app/src/main/AndroidManifest.xml")
java.mkdir(parents=True, exist_ok=True)
raw = base64.b64decode(TAR_B64)
with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as tar:
    for m in tar.getmembers():
        if m.name.endswith(".java"):
            (java / Path(m.name).name).write_bytes(tar.extractfile(m).read())
            print("wrote", m.name)
mt = manifest.read_text(encoding="utf-8")
for perm in [
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.RECEIVE_BOOT_COMPLETED",
    "android.permission.SCHEDULE_EXACT_ALARM",
    "android.permission.USE_EXACT_ALARM",
    "android.permission.USE_FULL_SCREEN_INTENT",
    "android.permission.WAKE_LOCK",
    "android.permission.VIBRATE",
    "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
]:
    token = 'android:name="%s"' % perm
    if token not in mt:
        mt = re.sub(r"(<manifest[^>]*>)", r'\1\n    <uses-permission android:name="%s" />' % perm, mt, count=1)
mt = re.sub(r'\s*<receiver\s+android:name="\.AyaAdhanReceiver"[^/]*/>\s*', "\n", mt)
mt = re.sub(r'\s*<receiver\s+android:name="\.AyaAdhanBootReceiver"[^>]*>.*?</receiver>\s*', "\n", mt, flags=re.DOTALL)
boot_block = """
        <receiver android:name=".AyaAdhanReceiver" android:enabled="true" android:exported="false" />
        <receiver android:name=".AyaAdhanBootReceiver" android:enabled="true" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.LOCKED_BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
                <action android:name="android.intent.action.TIME_SET" />
                <action android:name="android.intent.action.TIMEZONE_CHANGED" />
                <action android:name="android.intent.action.DATE_CHANGED" />
            </intent-filter>
        </receiver>
"""
mt = mt.replace("</application>", boot_block + "\n    </application>", 1)
manifest.write_text(mt, encoding="utf-8")
main = Path("android-app/android/app/src/main/java/com/aya/alquran/MainActivity.java")
code = main.read_text(encoding="utf-8")
injection = 'getBridge().getWebView().addJavascriptInterface(new AyaAdhanBridge(this), "AyaAdhan");'
if injection not in code:
    anchor = 'getBridge().getWebView().addJavascriptInterface(new AyaPrivateAudioStoreJs(), "AyaPrivateAudioStore");'
    if anchor in code:
        code = code.replace(anchor, anchor + "\n            " + injection, 1)
    else:
        alt = re.search(r'addJavascriptInterface\([^;]+\)\s*;', code)
        if not alt:
            raise SystemExit("no injection point for AyaAdhan")
        code = code[:alt.end()] + "\n            " + injection + code[alt.end():]
marker = "AYA_ADHAN_CHANNEL_EARLY_V8"
if marker not in code:
    inject = "\n        // " + marker + "\n        try { AyaAdhanReceiver.ensureChannel(this); } catch (Exception ignored) {}\n        try { AyaAdhanScheduler.rescheduleAll(this); } catch (Exception ignored) {}\n"
    m = re.search(r"super\s*\.\s*onCreate\s*\(\s*savedInstanceState\s*\)\s*;", code)
    if not m:
        raise SystemExit("no onCreate")
    code = code[:m.end()] + inject + code[m.end():]
main.write_text(code, encoding="utf-8")
print("main ok")


import re
from pathlib import Path

SYNC_NEW = (
    "function syncAdhanAlarms(){\n"
    "    if(!window.AyaAdhan||!state.timings)return;\n"
    "    for(const key of prayerOrder){\n"
    "      if(!state.adhan[key]){try{window.AyaAdhan.cancel(key)}catch(_){};continue;}\n"
    "      const m=String(state.timings[key]||'').match(/^([0-9]{1,2}):([0-9]{2})/);\n"
    "      if(!m)continue;\n"
    "      const hh=Number(m[1]), mm=Number(m[2]);\n"
    "      try{\n"
    "        if(window.AyaAdhan.scheduleAt) window.AyaAdhan.scheduleAt(key, names[key], hh, mm);\n"
    "      }catch(_){}\n"
    "    }\n"
    "  }"
)

for p in [
    Path("android-app/www/js/32-aya-prayer-times.js"),
    Path("android-app/android/app/src/main/assets/public/js/32-aya-prayer-times.js"),
    Path("app-source/js/32-aya-prayer-times.js"),
]:
    if not p.exists():
        continue
    t = p.read_text(encoding="utf-8")
    t2, n = re.subn(
        r"function syncAdhanAlarms\(\)\{.*?\n  \}",
        lambda _m: SYNC_NEW,
        t,
        count=1,
        flags=re.S,
    )
    if n:
        t = t2
        print("sync replaced", p)
    elif "scheduleAt" not in t:
        old_line = "if(at>now)try{window.AyaAdhan.schedule(key,names[key],at)}catch(_){}"
        new_line = (
            "try{const m=String(state.timings[key]||'').match(/^([0-9]{1,2}):([0-9]{2})/);"
            "if(m&&window.AyaAdhan.scheduleAt)window.AyaAdhan.scheduleAt(key,names[key],Number(m[1]),Number(m[2]));}catch(_){}"
        )
        if old_line in t:
            t = t.replace(old_line, new_line)
            print("line fallback", p)
    if "AYA_ADHAN_TEST_BTN_V4" not in t:
        old_note = 'id="ayaAdhanNote">تعمل التنبيهات في الخلفية بعد السماح بالإشعارات.</div>'
        new_note = (
            'id="ayaAdhanNote">تعمل التنبيهات في الخلفية بعد السماح بالإشعارات.</div>'
            '<button type="button" id="ayaAdhanTestBtn" style="margin-top:10px;width:100%;padding:10px;border-radius:10px;border:0;background:#16803b;color:#fff;font-weight:700">'
            'اختبار التنبيه بعد دقيقة (أغلق التطبيق بعد الضغط)'
            '</button><!-- AYA_ADHAN_TEST_BTN_V4 -->'
        )
        if old_note in t:
            t = t.replace(old_note, new_note, 1)
        if "ayaAdhanTestBtn" in t and "tb.onclick" not in t:
            t = t.replace(
                "if(!box.dataset.bound){",
                "if(!box.dataset.bound){\n"
                "      const tb=document.getElementById('ayaAdhanTestBtn');\n"
                "      if(tb&&!tb.dataset.bound){tb.dataset.bound='1';tb.onclick=(ev)=>{ev.preventDefault();ev.stopPropagation();\n"
                "        if(!window.AyaAdhan||!window.AyaAdhan.testIn){alert('جسر الأذان غير متاح في هذا البناء');return;}\n"
                "        try{window.AyaAdhan.requestExactAlarmPermission&&window.AyaAdhan.requestExactAlarmPermission();}catch(_){}\n"
                "        window.AyaAdhan.testIn(60);\n"
                "      };}\n",
                1,
            )
    p.write_text(t, encoding="utf-8")
    print("js", p, "scheduleAt" in t)
