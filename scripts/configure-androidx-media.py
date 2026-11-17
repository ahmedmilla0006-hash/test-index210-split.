from pathlib import Path
import re

gradle = Path("android-app/android/app/build.gradle")
is_kts = False
if not gradle.exists():
    gradle = Path("android-app/android/app/build.gradle.kts")
    is_kts = True

if not gradle.exists():
    raise SystemExit("ERROR: app Gradle file not found.")

text = gradle.read_text(encoding="utf-8")

additions = []
if "androidx.media:media" not in text:
    additions.append('    implementation("androidx.media:media:1.7.0")' if is_kts else '    implementation "androidx.media:media:1.7.0"')

if additions:
    if "dependencies {" not in text:
        raise SystemExit("ERROR: dependencies block not found in app Gradle file.")
    text = text.replace("dependencies {", "dependencies {\n" + "\n".join(additions), 1)
    gradle.write_text(text, encoding="utf-8")

final = gradle.read_text(encoding="utf-8")
if "androidx.media:media:1.7.0" not in final:
    raise SystemExit("ERROR: androidx.media:media:1.7.0 was not added to app Gradle.")
print("AndroidX Media 1.7.0 dependency is present.")
