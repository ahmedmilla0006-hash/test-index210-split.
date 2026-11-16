from pathlib import Path
root = Path('android-app/android/app/src/main')
java = root / 'java/com/aya/alquran'
java.mkdir(parents=True, exist_ok=True)
(java / 'AyaQuranWidgetProvider.java').write_text('''package com.aya.alquran;
import android.appwidget.AppWidgetProvider;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.ComponentName;
import android.content.Intent;
import android.app.PendingIntent;
import android.widget.RemoteViews;
public class AyaQuranWidgetProvider extends AppWidgetProvider {
 public static void refresh(Context c) {
  AppWidgetManager m=AppWidgetManager.getInstance(c);
  int[] ids=m.getAppWidgetIds(new ComponentName(c,AyaQuranWidgetProvider.class));
  for(int id:ids){
   RemoteViews v=new RemoteViews(c.getPackageName(),R.layout.aya_quran_widget);
   String verse=c.getSharedPreferences("aya_quran_widget",Context.MODE_PRIVATE).getString("verse","افتح تطبيق آية لاختيار آية قرآنية");
   v.setTextViewText(R.id.aya_widget_verse,verse);
   Intent i=c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
   if(i!=null){i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);PendingIntent p=PendingIntent.getActivity(c,731,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);v.setOnClickPendingIntent(R.id.aya_widget_root,p);}
   m.updateAppWidget(id,v);
  }
 }
 @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){refresh(c);}
}
''', encoding='utf-8')
(java / 'AyaQuranWidgetBridge.java').write_text('''package com.aya.alquran;
import android.content.Context;
import android.webkit.JavascriptInterface;
public class AyaQuranWidgetBridge {
 private final Context context;
 public AyaQuranWidgetBridge(Context c){context=c.getApplicationContext();}
 @JavascriptInterface public void setVerse(String verse){
  if(verse==null)verse=""; if(verse.length()>1200)verse=verse.substring(0,1200);
  context.getSharedPreferences("aya_quran_widget",Context.MODE_PRIVATE).edit().putString("verse",verse).apply();
  AyaQuranWidgetProvider.refresh(context);
 }
}
''', encoding='utf-8')
res=root/'res'; (res/'layout').mkdir(parents=True,exist_ok=True); (res/'xml').mkdir(parents=True,exist_ok=True)
(res/'layout/aya_quran_widget.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android" android:id="@+id/aya_widget_root" android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical" android:gravity="center" android:padding="12dp" android:background="#16803B">
<TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="آية قرآنية" android:textColor="#FFFFFF" android:textStyle="bold" android:textSize="14sp" android:paddingBottom="6dp"/>
<TextView android:id="@+id/aya_widget_verse" android:layout_width="match_parent" android:layout_height="wrap_content" android:gravity="center" android:text="افتح تطبيق آية لاختيار آية قرآنية" android:textColor="#FFFFFF" android:textSize="17sp" android:maxLines="5" android:ellipsize="end"/>
</LinearLayout>''',encoding='utf-8')
(res/'xml/aya_quran_widget_info.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android" android:minWidth="180dp" android:minHeight="110dp" android:initialLayout="@layout/aya_quran_widget" android:resizeMode="horizontal|vertical" android:widgetCategory="home_screen" android:updatePeriodMillis="0"/>''',encoding='utf-8')
manifest=root/'AndroidManifest.xml'; text=manifest.read_text(encoding='utf-8')
if '.AyaQuranWidgetProvider' not in text:
 receiver='''\n<receiver android:name=".AyaQuranWidgetProvider" android:exported="true"><intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE"/></intent-filter><meta-data android:name="android.appwidget.provider" android:resource="@xml/aya_quran_widget_info"/></receiver>\n'''
 text=text.replace('</application>',receiver+'</application>'); manifest.write_text(text,encoding='utf-8')
activity=java/'MainActivity.java'; code=activity.read_text(encoding='utf-8')
if 'AyaQuranWidgetBridge' not in code:
 anchor='installPlaybackBridge();'
 if anchor not in code: raise SystemExit('Cannot locate MainActivity bridge insertion point')
 code=code.replace(anchor,'getBridge().getWebView().addJavascriptInterface(new AyaQuranWidgetBridge(this), "AyaQuranWidget");\n            '+anchor,1)
 activity.write_text(code,encoding='utf-8')
print('Quran widget generated')
