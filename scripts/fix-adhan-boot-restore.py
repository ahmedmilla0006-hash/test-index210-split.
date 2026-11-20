from pathlib import Path
import re

ROOT = Path("android-app/android/app/src/main")
JAVA = ROOT / "java/com/aya/alquran"
MANIFEST = ROOT / "AndroidManifest.xml"
SCHEDULER = JAVA / "AyaAdhanScheduler.java"
BOOT = JAVA / "AyaAdhanBootReceiver.java"

for path in (MANIFEST, SCHEDULER, BOOT):
    if not path.is_file():
        raise SystemExit(f"ERROR: required Android adhan file missing: {path}")

scheduler = SCHEDULER.read_text(encoding="utf-8")
if not re.search(r"public\\s+static\\s+void\\s+rescheduleAll\\s*\\(\\s*Context\\s+\\w+\\s*\\)", scheduler):
    raise SystemExit("ERROR: AyaAdhanScheduler.rescheduleAll(Context) is missing; refusing an unsafe boot patch.")

# The scheduler uses ordinary credential-protected SharedPreferences.
# Therefore, do not register LOCKED_BOOT_COMPLETED: that event runs before
# the user unlocks the device and cannot safely read these preferences.
boot_code = r\'''package com.aya.alquran;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class AyaAdhanBootReceiver extends BroadcastReceiver {
    private static final String TAG = "AyaAdhan";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;

        String action = intent.getAction();
        if (action == null) return;

        Log.i(TAG, "Boot/time event received: " + action);

        try {
            // The app's adhan settings are stored in normal SharedPreferences.
            // BOOT_COMPLETED is the supported post-unlock restoration event.
            AyaAdhanReceiver.ensureChannel(context);
            AyaAdhanScheduler.rescheduleAll(context);
            Log.i(TAG, "Prayer alarms restored after system event.");
        } catch (Exception error) {
            Log.e(TAG, "Could not restore prayer alarms.", error);
        }
    }
}
\'''

BOOT.write_text(boot_code, encoding="utf-8")

manifest = MANIFEST.read_text(encoding="utf-8")
pattern = re.compile(
    r'(<receiver\\b(?=[^>]*android:name=["\\']\\.AyaAdhanBootReceiver["\\'])[^>]*>)(.*?)(</receiver>)',
    re.DOTALL,
)
match = pattern.search(manifest)
if not match:
    raise SystemExit("ERROR: AyaAdhanBootReceiver is not registered in AndroidManifest.xml.")

opening, body, closing = match.groups()
body = re.sub(
    r'\\s*<action\\s+android:name=["\\']android\\.intent\\.action\\.LOCKED_BOOT_COMPLETED["\\']\\s*/>',
    "",
    body,
)
if 'android:enabled="true"' not in opening:
    opening = opening[:-1] + ' android:enabled="true">'
if 'android:exported=' not in opening:
    opening = opening[:-1] + ' android:exported="true">'
manifest = manifest[:match.start()] + opening + body + closing + manifest[match.end():]
MANIFEST.write_text(manifest, encoding="utf-8")

# Fail the build if a later workflow step or source change reintroduces a
# misleading pre-unlock receiver registration or removes the boot hook.
final_manifest = MANIFEST.read_text(encoding="utf-8")
final_boot = BOOT.read_text(encoding="utf-8")
block = pattern.search(final_manifest)
if not block:
    raise SystemExit("ERROR: boot receiver registration disappeared.")
receiver_block = block.group(0)
for required in (
    "android.intent.action.BOOT_COMPLETED",
    "android.intent.action.MY_PACKAGE_REPLACED",
    "android.intent.action.TIME_SET",
    "android.intent.action.TIMEZONE_CHANGED",
    "android.intent.action.DATE_CHANGED",
):
    if required not in receiver_block:
        raise SystemExit(f"ERROR: boot receiver missing required action: {required}")
if "LOCKED_BOOT_COMPLETED" in receiver_block or "directBootAware=\\"true\\"" in block.group(1):
    raise SystemExit("ERROR: pre-unlock event registered without Direct Boot storage support.")
if "AyaAdhanScheduler.rescheduleAll(context)" not in final_boot:
    raise SystemExit("ERROR: boot receiver does not restore scheduled prayer alarms.")
if "AyaAdhanReceiver.ensureChannel(context)" not in final_boot:
    raise SystemExit("ERROR: boot receiver does not ensure the existing adhan channel.")

print("Adhan reboot restoration verified: post-unlock boot, package replacement and clock/timezone changes.")
