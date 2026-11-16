from pathlib import Path
import re

root = Path("android-app/android/app/src/main")
java = root / "java/com/aya/alquran"
java.mkdir(parents=True, exist_ok=True)

(java / "AyaQuranWidgetProvider.java").write_text("""package com.aya.alquran;
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
   android.content.SharedPreferences sp=c.getSharedPreferences("aya_quran_widget",Context.MODE_PRIVATE);
   String verse=sp.getString("verse","افتح تطبيق آية لاختيار آية قرآنية");
   int surah=sp.getInt("surah",0), ayah=sp.getInt("ayah",0), page=sp.getInt("page",0);
   String name=sp.getString("surahName","");
   v.setTextViewText(R.id.aya_widget_verse,verse);
   String meta=(name.isEmpty()?"":name+" • ") + (ayah>0?"الآية "+ayah:"") + (page>0?" • الصفحة "+page:"");
   v.setTextViewText(R.id.aya_widget_meta,meta);
   Intent i=new Intent(c,MainActivity.class);
   i.setAction("com.aya.alquran.OPEN_WIDGET_AYAH");
   i.putExtra("aya_widget_surah",surah); i.putExtra("aya_widget_ayah",ayah); i.putExtra("aya_widget_page",page);
   i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
   PendingIntent p=PendingIntent.getActivity(c,731,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
   v.setOnClickPendingIntent(R.id.aya_widget_root,p);
   m.updateAppWidget(id,v);
  }
 }
 @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){refresh(c);}
}
""",encoding="utf-8")

(java / "AyaQuranWidgetBridge.java").write_text("""package com.aya.alquran;
import android.content.Context;
import android.webkit.JavascriptInterface;
import org.json.JSONObject;
public class AyaQuranWidgetBridge {
 private final Context context;
 public AyaQuranWidgetBridge(Context c){context=c.getApplicationContext();}
 @JavascriptInterface public void setVerse(String verse,int surah,int ayah,int page,String surahName){
  if(verse==null)verse=""; if(verse.length()>1200)verse=verse.substring(0,1200);
  context.getSharedPreferences("aya_quran_widget",Context.MODE_PRIVATE).edit()
   .putString("verse",verse).putInt("surah",surah).putInt("ayah",ayah).putInt("page",page)
   .putString("surahName",surahName==null?"":surahName).apply();
  AyaQuranWidgetProvider.refresh(context);
 }
 @JavascriptInterface public String consumeTarget(){
  android.content.SharedPreferences sp=context.getSharedPreferences("aya_quran_widget",Context.MODE_PRIVATE);
  int s=sp.getInt("pendingSurah",0), a=sp.getInt("pendingAyah",0), p=sp.getInt("pendingPage",0);
  if(s<1||a<1)return "";
  sp.edit().remove("pendingSurah").remove("pendingAyah").remove("pendingPage").apply();
  try{JSONObject o=new JSONObject();o.put("surah",s);o.put("ayah",a);o.put("page",p);return o.toString();}
  catch(Exception e){return "";}
 }
}
""",encoding="utf-8")

res=root/"res"
(res/"layout").mkdir(parents=True,exist_ok=True); (res/"xml").mkdir(parents=True,exist_ok=True)
(res/"layout/aya_quran_widget.xml").write_text("""<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android" android:id="@+id/aya_widget_root" android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical" android:gravity="center" android:padding="12dp" android:background="#16803B">
<TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="آية قرآنية" android:textColor="#FFFFFF" android:textStyle="bold" android:textSize="14sp" android:paddingBottom="5dp"/>
<TextView android:id="@+id/aya_widget_verse" android:layout_width="match_parent" android:layout_height="wrap_content" android:gravity="center" android:text="افتح تطبيق آية لاختيار آية قرآنية" android:textColor="#FFFFFF" android:textSize="17sp" android:maxLines="4" android:ellipsize="end"/>
<TextView android:id="@+id/aya_widget_meta" android:layout_width="match_parent" android:layout_height="wrap_content" android:gravity="center" android:textColor="#E7F5EA" android:textSize="11sp" android:paddingTop="5dp"/>
</LinearLayout>""",encoding="utf-8")
(res/"xml/aya_quran_widget_info.xml").write_text("""<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android" android:minWidth="180dp" android:minHeight="110dp" android:initialLayout="@layout/aya_quran_widget" android:resizeMode="horizontal|vertical" android:widgetCategory="home_screen" android:updatePeriodMillis="0"/>""",encoding="utf-8")

manifest=root/"AndroidManifest.xml"
mt=manifest.read_text(encoding="utf-8")
if ".AyaQuranWidgetProvider" not in mt:
 receiver='''\n<receiver android:name=".AyaQuranWidgetProvider" android:exported="true"><intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE"/></intent-filter><meta-data android:name="android.appwidget.provider" android:resource="@xml/aya_quran_widget_info"/></receiver>\n'''
 mt=mt.replace("</application>",receiver+"</application>")
 manifest.write_text(mt,encoding="utf-8")

activity=java/"MainActivity.java"
code=activity.read_text(encoding="utf-8")
if "AyaQuranWidgetBridge" not in code:
 anchor='getBridge().getWebView().addJavascriptInterface(new AyaMediaJs(), "AndroidInterface");'
 if anchor not in code: raise SystemExit("Cannot locate AndroidInterface injection point")
 code=code.replace(anchor,anchor+'\n            getBridge().getWebView().addJavascriptInterface(new AyaQuranWidgetBridge(this), "AyaQuranWidget");',1)
if "pendingSurah" not in code:
 anchor='if (intent == null) return;'
 if anchor not in code: raise SystemExit("Cannot locate handleIntent null guard")
 addition='''if (intent.hasExtra("aya_widget_surah") && intent.hasExtra("aya_widget_ayah")) {
            getSharedPreferences("aya_quran_widget", MODE_PRIVATE).edit()
                .putInt("pendingSurah", intent.getIntExtra("aya_widget_surah", 0))
                .putInt("pendingAyah", intent.getIntExtra("aya_widget_ayah", 0))
                .putInt("pendingPage", intent.getIntExtra("aya_widget_page", 0)).apply();
        }
        '''
 code=code.replace(anchor,anchor+"\n        "+addition,1)
activity.write_text(code,encoding="utf-8")
print("Quran widget Android files and intent bridge generated.")
