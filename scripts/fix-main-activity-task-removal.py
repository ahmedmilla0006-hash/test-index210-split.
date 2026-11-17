#!/usr/bin/env python3
"""Remove the invalid Activity-level onTaskRemoved override."""
from pathlib import Path
import re

activity = Path("android-app/android/app/src/main/java/com/aya/alquran/MainActivity.java")
text = activity.read_text(encoding="utf-8")

# onTaskRemoved() belongs to Service, not Activity/BridgeActivity.
# Remove any previously injected override from MainActivity.
text = re.sub(
    r"\n\s*@Override\s*\n\s*public void onTaskRemoved\(Intent rootIntent\)\s*\{.*?\n\s*\}\s*\n",
    "\n",
    text,
    flags=re.DOTALL,
)
text = text.replace("\n        super.onTaskRemoved(rootIntent);", "")
activity.write_text(text, encoding="utf-8")

if "onTaskRemoved(" in text or "super.onTaskRemoved(" in text:
    raise SystemExit("ERROR: invalid onTaskRemoved override remains in MainActivity.java")

print("MainActivity.java fixed: no onTaskRemoved override.")
