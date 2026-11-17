from pathlib import Path
import re, shutil

root=Path("android-app/android/app/src/main")
src=Path("app-source/assets/adhan-default.mp3")
if not src.is_file(): raise SystemExit("Missing app-source/assets/adhan-default.mp3")
raw=root/"res/raw"
raw.mkdir(parents=True,exist_ok=True)
shutil.copy2(src,raw/"adhan_default.mp3")

receiver=root/"java/com/aya/alquran/AyaAdhanReceiver.java"
s=receiver.read_text(encoding="utf-8")
s=re.sub(r'static final String CHANNEL = "[^"]+";', 'static final String CHANNEL = "aya_adhan_alerts_v11";', s, count=1)

# The notification generator creates the channel inline inside onReceive().
# Replace that exact generated statement with a channel whose sound is bundled.
old='nm.createNotificationChannel(new NotificationChannel(CHANNEL, "تنبيهات الأذان", NotificationManager.IMPORTANCE_HIGH));'
new='''NotificationChannel channel = new NotificationChannel(CHANNEL, "تنبيهات الأذان", NotificationManager.IMPORTANCE_HIGH);
            Uri sound = Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.adhan_default);
            channel.setSound(sound, new android.media.AudioAttributes.Builder()
                .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            nm.createNotificationChannel(channel);'''
if old not in s:
    raise SystemExit("Generated inline notification channel statement not found")
s=s.replace(old,new,1)
if "import android.net.Uri;" not in s:
    s=s.replace("import android.os.Build;", "import android.os.Build;\nimport android.net.Uri;",1)
receiver.write_text(s,encoding="utf-8")

bridge=root/"java/com/aya/alquran/AyaAdhanBridge.java"
b=bridge.read_text(encoding="utf-8")
if "openSoundSettings" not in b:
    marker='    @JavascriptInterface public void requestExactAlarmPermission() {'
    method='''    @JavascriptInterface public void openSoundSettings() {
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                Intent i = new Intent(android.provider.Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS);
                i.putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, activity.getPackageName());
                i.putExtra(android.provider.Settings.EXTRA_CHANNEL_ID, AyaAdhanReceiver.CHANNEL);
                activity.startActivity(i);
            } else {
                Intent i = new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                i.putExtra("app_package", activity.getPackageName());
                i.putExtra("app_uid", activity.getApplicationInfo().uid);
                activity.startActivity(i);
            }
        } catch (Exception ignored) {}
    }
'''
    if marker not in b: raise SystemExit("Bridge anchor missing")
    b=b.replace(marker,method+marker,1)
    bridge.write_text(b,encoding="utf-8")

js=Path("app-source/js/32-aya-prayer-times.js")
t=js.read_text(encoding="utf-8")
old='<div class="aya-adhan-options" id="ayaAdhanOptions"></div><div class="aya-adhan-note" id="ayaAdhanNote">'
new='<div class="aya-adhan-options" id="ayaAdhanOptions"></div><button type="button" id="ayaAdhanSoundSettings" class="aya-prayer-toggle" style="width:100%;margin-top:10px">🎵 اختيار نغمة الأذان</button><div class="aya-adhan-note" id="ayaAdhanNote">'
if old not in t: raise SystemExit("Adhan settings UI anchor missing")
t=t.replace(old,new,1)
marker='  function syncAdhanAlarms(){'
handler='''  document.addEventListener('click',e=>{
    if(e.target.closest('#ayaAdhanSoundSettings')){
      if(window.AyaAdhan?.openSoundSettings)window.AyaAdhan.openSoundSettings();
      else {const n=$('ayaAdhanNote');if(n)n.textContent='اختيار النغمة متاح في تطبيق أندرويد من إعدادات إشعارات الأذان.';}
    }
  });
'''
if 'ayaAdhanSoundSettings' not in t[t.find(marker)-500:t.find(marker)]:
    if marker not in t: raise SystemExit("JS sync anchor missing")
    t=t.replace(marker,handler+marker,1)
js.write_text(t,encoding="utf-8")
# Capacitor sync already ran; refresh web and native copies with the patched settings UI.
web_js=Path("android-app/www/js/32-aya-prayer-times.js")
if web_js.parent.is_dir(): web_js.write_text(t,encoding="utf-8")
native_js=Path("android-app/android/app/src/main/assets/public/js/32-aya-prayer-times.js")
if native_js.parent.is_dir(): native_js.write_text(t,encoding="utf-8")
print("Installed offline bundled default adhan sound and Android channel sound settings.")
