# Aya – split from index210.html

This package separates the original single HTML file into:
- `index.html`: page markup and references.
- `css/`: 25 CSS files, in the same cascade order as the original style blocks.
- `js/`: 29 JavaScript files, loaded in the same order and at the same positions as the original inline scripts.

## Important
This is a mechanical separation of the supplied `index210.html`. The code inside CSS and JavaScript blocks has not been intentionally rewritten. Existing style IDs and script IDs are preserved on their external `<link>` / `<script>` elements.

Keep all paths and folders together when uploading. Do not upload only `index.html`.

This package does not add Android, Capacitor, Gradle, GitHub Actions, manifest, service worker, icons, SVG Quran pages, or other assets that were not embedded in the supplied file. Any original relative/remote resource references remain as they were.

Before replacing the live repository, test this version separately. The package has not yet been validated in an Android build or on-device playback/highlighting.
