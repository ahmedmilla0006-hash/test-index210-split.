from pathlib import Path
import re

java_dir = Path("android-app/android/app/src/main/java/com/aya/alquran")
java_dir.mkdir(parents=True, exist_ok=True)
manifest = Path("android-app/android/app/src/main/AndroidManifest.xml")
main = java_dir / "MainActivity.java"
res = Path("android-app/android/app/src/main/res")

replaced = 0
for xml in res.rglob("*.xml"):
    p = str(xml)
    if any(x in p for x in ("/layout/", "/mipmap", "/drawable")):
        continue
    try:
        t = xml.read_text(encoding="utf-8")
    except Exception:
        continue
    if "windowBackground" not in t and "SplashScreen" not in t and "splash" not in t.lower():
        continue
    orig = t
    t = re.sub(r'(<item\s+name="android:windowBackground">)[^<]+(</item>)', r'\1#f5f0e7\2', t)
    t = re.sub(r'(<item\s+name="windowBackground">)[^<]+(</item>)', r'\1#f5f0e7\2', t)
    t = re.sub(r'(<item\s+name="android:windowSplashScreenBackground">)[^<]+(</item>)', r'\1#f5f0e7\2', t)
    t = re.sub(r'(<item\s+name="windowSplashScreenBackground">)[^<]+(</item>)', r'\1#f5f0e7\2', t)
    t = re.sub(r'(<item\s+name="windowSplashScreenAnimatedIcon">)[^<]+(</item>)', r'\1@android:color/transparent\2', t)
    t = re.sub(r'(<item\s+name="android:windowSplashScreenAnimatedIcon">)[^<]+(</item>)', r'\1@android:color/transparent\2', t)
    if t != orig:
        xml.write_text(t, encoding="utf-8")
        replaced += 1
        print("patched", xml)
print("themes patched:", replaced)

values = res / "values"
values.mkdir(parents=True, exist_ok=True)
for old in list(values.glob("aya_window*.xml")) + list(values.glob("aya_solid*.xml")):
    try:
        old.unlink()
    except Exception:
        pass

(values / "aya_solid_window.xml").write_text(
    "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n"
    "<resources>\n"
    "    <style name=\"Aya.SolidWindow\" parent=\"@android:style/Theme.DeviceDefault.NoActionBar\">\n"
    "        <item name=\"android:windowBackground\">#f5f0e7</item>\n"
    "        <item name=\"android:windowNoTitle\">true</item>\n"
    "        <item name=\"android:windowActionBar\">false</item>\n"
    "        <item name=\"android:statusBarColor\">#f5f0e7</item>\n"
    "        <item name=\"android:navigationBarColor\">#f5f0e7</item>\n"
    "    </style>\n"
    "</resources>\n",
    encoding="utf-8",
)
print("aya_solid_window.xml written")

manage_src = r'''package com.aya.alquran;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;

public class ManageSpaceActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            requestWindowFeature(Window.FEATURE_NO_TITLE);
            getWindow().setBackgroundDrawable(new ColorDrawable(Color.parseColor("#f5f0e7")));
            if (Build.VERSION.SDK_INT >= 21) {
                getWindow().setStatusBarColor(Color.parseColor("#f5f0e7"));
            }
        } catch (Exception ignored) {}
        try {
            SharedPreferences sp = getSharedPreferences("aya_prefs", MODE_PRIVATE);
            sp.edit().putBoolean("open_storage", true).apply();
        } catch (Exception ignored) {}
        try {
            Intent i = new Intent(this, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP
                    | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                    | Intent.FLAG_ACTIVITY_NEW_TASK);
            i.putExtra("aya_open_storage", true);
            startActivity(i);
        } catch (Exception ignored) {}
        finish();
        try { overridePendingTransition(0, 0); } catch (Exception ignored) {}
    }
}
'''
(java_dir / "ManageSpaceActivity.java").write_text(manage_src, encoding="utf-8")
print("ManageSpaceActivity.java written.")

if not manifest.exists():
    raise SystemExit("AndroidManifest.xml not found")
mt = manifest.read_text(encoding="utf-8")

if re.search(r'android:manageSpaceActivity\s*=\s*"[^"]*"', mt):
    mt = re.sub(r'android:manageSpaceActivity\s*=\s*"[^"]*"',
                'android:manageSpaceActivity="com.aya.alquran.ManageSpaceActivity"', mt, count=1)
else:
    def add_attr(m):
        return m.group(1) + ' android:manageSpaceActivity="com.aya.alquran.ManageSpaceActivity"' + m.group(2)
    mt2, n = re.subn(r'(<application\b[^>]*?)(/?>)', add_attr, mt, count=1, flags=re.DOTALL)
    if not n:
        raise SystemExit("ERROR: no application tag")
    mt = mt2

if 'android:name=".ManageSpaceActivity"' not in mt:
    act = (
        '        <activity\n'
        '            android:name=".ManageSpaceActivity"\n'
        '            android:label="إدارة المساحة"\n'
        '            android:exported="true"\n'
        '            android:excludeFromRecents="true"\n'
        '            android:theme="@style/Aya.SolidWindow" />\n'
    )
    mt = mt.replace("</application>", act + "    </application>", 1)
else:
    mt = re.sub(
        r'(android:name="\.ManageSpaceActivity"[^>]*)android:theme="[^"]*"',
        r'\1android:theme="@style/Aya.SolidWindow"',
        mt, count=1,
    )

idx = mt.find('android:name=".MainActivity"')
if idx >= 0:
    window = mt[idx:idx+600]
    if 'android:theme=' in window:
        window2 = re.sub(r'android:theme="[^"]*"', 'android:theme="@style/Aya.SolidWindow"', window, count=1)
        mt = mt[:idx] + window2 + mt[idx+600:]
        print("MainActivity theme replaced")
    else:
        mt = mt[:idx] + 'android:name=".MainActivity"\n            android:theme="@style/Aya.SolidWindow"' + mt[idx+len('android:name=".MainActivity"'):]
        print("MainActivity theme inserted")

manifest.write_text(mt, encoding="utf-8")
print("manifest OK")

MARKER = "AYA_STORAGE_MANAGER_V8"
if main.exists():
    at = main.read_text(encoding="utf-8")
    if MARKER in at:
        print("MainActivity storage hook present")
    else:
        helper = """
    // """ + MARKER + """
    private void openStorageManagerFromIntent(Intent intent) {
        boolean open = false;
        try { if (intent != null && intent.getBooleanExtra("aya_open_storage", false)) open = true; } catch (Exception ignored) {}
        try {
            android.content.SharedPreferences sp = getSharedPreferences("aya_prefs", MODE_PRIVATE);
            if (sp.getBoolean("open_storage", false)) open = true;
            sp.edit().putBoolean("open_storage", false).apply();
        } catch (Exception ignored) {}
        if (!open) return;
        try { if (intent != null) intent.removeExtra("aya_open_storage"); } catch (Exception ignored) {}
        try {
            getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.parseColor("#f5f0e7")));
            if (android.os.Build.VERSION.SDK_INT >= 21) {
                getWindow().setStatusBarColor(android.graphics.Color.parseColor("#f5f0e7"));
            }
        } catch (Exception ignored) {}
        final android.webkit.WebView[] holder = new android.webkit.WebView[1];
        final String js = "try{localStorage.setItem('aya_open_storage','1');sessionStorage.setItem('aya_open_storage','1');if(window.__ayaRequestStorageManager)window.__ayaRequestStorageManager();else if(window.__ayaOpenStorageManager)window.__ayaOpenStorageManager();}catch(e){}";
        Runnable tryOpen = new Runnable() {
            int tries = 0;
            @Override public void run() {
                try {
                    if (holder[0] == null) { try { holder[0] = getBridge().getWebView(); } catch (Exception ignored) {} }
                    final android.webkit.WebView wv = holder[0];
                    if (wv != null) {
                        wv.post(new Runnable() { @Override public void run() { try { wv.evaluateJavascript(js, null); } catch (Exception ignored) {} } });
                        if (tries >= 8) return;
                    }
                } catch (Exception ignored) {}
                if (tries++ < 50) { try { getWindow().getDecorView().postDelayed(this, 300); } catch (Exception ignored) {} }
            }
        };
        try { getWindow().getDecorView().postDelayed(tryOpen, 300); } catch (Exception ignored) {}
        try { getWindow().getDecorView().postDelayed(tryOpen, 1200); } catch (Exception ignored) {}
    }
"""
        pos = at.rfind("}")
        candidate = at[:pos] + helper + "\n}\n"
        # Locate onCreate regardless of public/protected/private formatting.
        m = re.search(r"\bvoid\s+onCreate\s*\([^)]*\)\s*\{", candidate)
        if not m:
            raise SystemExit("ERROR: MainActivity onCreate method not found; refusing to write MainActivity")
        body_start = m.end()
        super_call = re.search(r"\bsuper\s*\.\s*onCreate\s*\(\s*savedInstanceState\s*\)\s*;", candidate[body_start:])
        if not super_call:
            raise SystemExit("ERROR: super.onCreate(savedInstanceState) not found inside MainActivity.onCreate; refusing to write MainActivity")
        insert_at = body_start + super_call.end()
        candidate = candidate[:insert_at] + "\n        openStorageManagerFromIntent(getIntent()); // " + MARKER + candidate[insert_at:]
        if candidate.count("{") != candidate.count("}"):
            raise SystemExit("ERROR: MainActivity braces are unbalanced; refusing to write MainActivity")
        main.write_text(candidate, encoding="utf-8")
        print("MainActivity patched V8 and saved")


