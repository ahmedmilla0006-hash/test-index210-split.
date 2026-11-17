#!/usr/bin/env python3
"""Apply Android app integrations maintained in the experimental app repository.

Run from the workflow workspace root after Capacitor Android has been generated.
Build identity, Manage Space, and microphone-permission policy intentionally remain
in the signing/build repository workflow.
"""
from pathlib import Path
import runpy
import subprocess
import sys

BASE = Path(__file__).resolve().parent

def run(name):
    path = BASE / name
    if not path.is_file():
        raise SystemExit(f"Required app integration script missing: {path}")
    print(f"\n=== Aya app integration: {name} ===", flush=True)
    runpy.run_path(str(path), run_name="__main__")

# The media script installs the app-owned MainActivity and AyaMediaService.
# Subsequent scripts extend that baseline with widget, adhan, connectivity and
# notification-dismissal integrations.
run("install-aya-android-icons.py")
run("configure-media-notifications.py")
run("add-quran-widget.py")
run("add-adhan-notifications.py")
run("apply-adhan-build-patches.py")

# Keep the packaged prayer-times module in sync with the patched web source.
web_prayer = Path("android-app/www/js/32-aya-prayer-times.js")
packaged_js = Path("android-app/android/app/src/main/assets/public/js")
if web_prayer.is_file() and packaged_js.is_dir():
    (packaged_js / web_prayer.name).write_bytes(web_prayer.read_bytes())
run("fix-main-activity-task-removal.py")
run("configure-android-network-bridge.py")
run("fix-media-notification-dismiss.py")
run("configure-androidx-media.py")

# Verify the native media components and key bridges before proceeding to Gradle.
root = Path("android-app/android/app/src/main")
java = root / "java/com/aya/alquran"
manifest = root / "AndroidManifest.xml"
checks = {
    java / "MainActivity.java": ["AyaPrivateAudioStoreJs", "AYA_NATIVE_NETWORK_BRIDGE_V1", "markMediaNotifDismissed"],
    java / "AyaMediaService.java": ["public class AyaMediaService"],
    java / "AyaAdhanBridge.java": ["public class AyaAdhanBridge", "void schedule("],
    java / "AyaAdhanReceiver.java": ["public class AyaAdhanReceiver", "void onReceive("],
    manifest: ['android:name=".AyaMediaService"', "android.permission.ACCESS_NETWORK_STATE"],
}
for path, tokens in checks.items():
    if not path.is_file():
        raise SystemExit(f"Required Android file missing: {path}")
    data = path.read_text(encoding="utf-8")
    missing = [token for token in tokens if token not in data]
    if missing:
        raise SystemExit(f"Android integration verification failed in {path}: {missing}")

gradle = Path("android-app/android/app/build.gradle")
if not gradle.exists():
    gradle = Path("android-app/android/app/build.gradle.kts")
if not gradle.exists() or "androidx.media:media:1.7.0" not in gradle.read_text(encoding="utf-8"):
    raise SystemExit("AndroidX Media dependency verification failed.")

print("\nAll app-owned Android integrations were applied and verified.")
