from pathlib import Path
import re

root = Path("android-app/android/app/src/main")
manifest = root / "AndroidManifest.xml"
activity = root / "java/com/aya/alquran/MainActivity.java"

if not manifest.exists() or not activity.exists():
    raise SystemExit("ERROR: Android manifest or generated MainActivity.java is missing.")

# Android network-state permission. Insert immediately before <application>
# so this remains reliable across manifest formatting variants.
mt = manifest.read_text(encoding="utf-8")
permission = "android.permission.ACCESS_NETWORK_STATE"
if permission not in mt:
    application_tag = re.search(r"<application\\b", mt)
    if application_tag:
        insertion = application_tag.start()
        mt = mt[:insertion] + '    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\\n    ' + mt[insertion:]
    else:
        manifest_tag = re.search(r"<manifest\\b[^>]*>", mt, flags=re.DOTALL)
        if not manifest_tag:
            raise SystemExit("ERROR: Could not locate <manifest> or <application> tag in " + str(manifest))
        insertion = manifest_tag.end()
        mt = mt[:insertion] + '\\n    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />' + mt[insertion:]
    manifest.write_text(mt, encoding="utf-8")

final_manifest = manifest.read_text(encoding="utf-8")
if 'android:name="android.permission.ACCESS_NETWORK_STATE"' not in final_manifest:
    raise SystemExit("ERROR: ACCESS_NETWORK_STATE permission was not written to " + str(manifest))

java = activity.read_text(encoding="utf-8")

imports = [
    "import android.net.ConnectivityManager;",
    "import android.net.Network;",
    "import android.net.NetworkRequest;",
    "import android.net.NetworkCapabilities;",
    "import android.net.NetworkInfo;",
]
for item in imports:
    if item not in java:
        java = java.replace("import android.os.Bundle;", "import android.os.Bundle;\n" + item, 1)

if "AYA_NATIVE_NETWORK_BRIDGE_V1" not in java:
    fields = """
    // AYA_NATIVE_NETWORK_BRIDGE_V1
    private ConnectivityManager ayaConnectivityManager;
    private ConnectivityManager.NetworkCallback ayaNetworkCallback;
    private Boolean ayaLastPublishedNetworkState = null;

    private boolean isAyaInternetConnected() {
        try {
            if (ayaConnectivityManager == null) {
                ayaConnectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            }
            if (ayaConnectivityManager == null) return false;
            NetworkInfo info = ayaConnectivityManager.getActiveNetworkInfo();
            return info != null && info.isConnected();
        } catch (Exception ignored) {
            return false;
        }
    }

    private void publishAyaNetworkState() {
        final boolean connected = isAyaInternetConnected();
        runOnUiThread(() -> {
            if (ayaLastPublishedNetworkState != null
                    && ayaLastPublishedNetworkState.booleanValue() == connected) return;
            ayaLastPublishedNetworkState = connected;
            String js = "(function(){try{"
                    + "window.__AYA_NATIVE_ONLINE=" + (connected ? "true" : "false") + ";"
                    + "try{Object.defineProperty(navigator,'onLine',{configurable:true,get:function(){return window.__AYA_NATIVE_ONLINE;}});}catch(e){}"
                    + "window.dispatchEvent(new Event('" + (connected ? "online" : "offline") + "'));"
                    + "}catch(e){}})();";
            evalJs(js);
        });
    }

    private void registerAyaNetworkCallback() {
        try {
            if (ayaConnectivityManager == null) {
                ayaConnectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            }
            if (ayaConnectivityManager == null || ayaNetworkCallback != null) return;
            ayaNetworkCallback = new ConnectivityManager.NetworkCallback() {
                @Override public void onAvailable(Network network) {
                    getWindow().getDecorView().postDelayed(() -> publishAyaNetworkState(), 350);
                }
                @Override public void onLost(Network network) {
                    getWindow().getDecorView().postDelayed(() -> publishAyaNetworkState(), 500);
                }
                @Override public void onCapabilitiesChanged(Network network, NetworkCapabilities caps) {
                    getWindow().getDecorView().postDelayed(() -> publishAyaNetworkState(), 250);
                }
            };
            NetworkRequest request = new NetworkRequest.Builder()
                    .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    .build();
            ayaConnectivityManager.registerNetworkCallback(request, ayaNetworkCallback);
        } catch (Exception ignored) {
            ayaNetworkCallback = null;
        }
        getWindow().getDecorView().postDelayed(() -> publishAyaNetworkState(), 500);
    }
    """
    java = java.replace(
        "    private static final String CHANNEL_ID",
        fields + "\n    private static final String CHANNEL_ID",
        1,
    )

    java = java.replace(
        "        instance = this;\n",
        "        instance = this;\n        registerAyaNetworkCallback();\n",
        1,
    )

    java = java.replace(
        "        super.onResume();\n",
        "        super.onResume();\n        registerAyaNetworkCallback();\n        getWindow().getDecorView().postDelayed(() -> publishAyaNetworkState(), 300);\n",
        1,
    )

    java = java.replace(
        "    public void onDestroy() {\n",
        "    public void onDestroy() {\n        try { if (ayaConnectivityManager != null && ayaNetworkCallback != null) ayaConnectivityManager.unregisterNetworkCallback(ayaNetworkCallback); } catch (Exception ignored) {}\n        ayaNetworkCallback = null;\n",
        1,
    )

activity.write_text(java, encoding="utf-8")

# Strict checks: avoid silently shipping a partial injection.
final_manifest = manifest.read_text(encoding="utf-8")
final_java = activity.read_text(encoding="utf-8")
required = [
    "android.permission.ACCESS_NETWORK_STATE",
]
if not all(x in final_manifest for x in required):
    raise SystemExit("ERROR: ACCESS_NETWORK_STATE permission verification failed.")
for token in (
    "AYA_NATIVE_NETWORK_BRIDGE_V1",
    "registerAyaNetworkCallback",
    "publishAyaNetworkState",
    "navigator,'onLine'",
    "unregisterNetworkCallback",
):
    if token not in final_java:
        raise SystemExit("ERROR: network bridge verification failed: " + token)
print("Native network bridge and manifest permission verified.")
