# Packaging HIRO SEGAWA as an Android APK (Capacitor)

The app already ships a Capacitor config (`capacitor.config.json`) with
`appId: com.hirosegawa.player`, `appName: HIRO SEGAWA` and `webDir: dist`. Nothing else in the
project has to change.

Capacitor wraps the built web bundle in a native Android WebView, so the audio engine, IndexedDB
library and every screen keep working.

## Prerequisites

- **Node 22+** and this repository checked out.
- **Android Studio** (latest stable) with the Android SDK (API 35), Platform Tools and Build Tools.
- **JDK 21** — Android Studio bundles one; Capacitor 7 requires Java 21.
- A physical Android device with USB debugging, or an emulator.
- macOS is not required (Linux/Windows work).

## 1. Install Capacitor

```bash
npm ci

# Capacitor core + Android platform + CLI
npm install @capacitor/core @capacitor/android
npm install --save-dev @capacitor/cli
```

The committed `capacitor.config.json` is picked up automatically. If you prefer to recreate it:

```bash
npx cap init "HIRO SEGAWA" com.hirosegawa.player --web-dir dist
```

## 2. Add the Android project

```bash
npx cap add android
```

This creates the native `android/` Gradle project. Commit it if you want reproducible release
builds (it is generated once, then customised).

## 3. Build the web bundle and sync

For native builds the app is served from `https://localhost` inside the WebView, so the base path
must stay `/`. The service worker is intentionally disabled in the native shell (Capacitor serves
local files; a cached shell would go stale after updates).

```bash
VITE_DISABLE_SW=1 npm run build
npx cap sync android
```

Repeat those two commands for every web change. Shortcut:

```bash
npm run build:android && npx cap sync android
```

## 4. Run on a device

```bash
npx cap open android     # opens Android Studio → Run ▶
```

Or fully from the CLI:

```bash
cd android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
npx cap run android      # or: launch on a connected device/emulator
```

First Gradle run downloads dependencies (a few minutes). If the SDK is not found, set
`ANDROID_HOME`/`sdk.dir` (`android/local.properties`).

## 5. Release APK / AAB

```bash
keytool -genkey -v -keystore hiro-release.keystore -alias hiro \
  -keyalg RSA -keysize 2048 -validity 10000
```

Create `android/keystore.properties` (never commit it — add it to `.gitignore`):

```properties
storeFile=../../hiro-release.keystore
storePassword=********
keyAlias=hiro
keyPassword=********
```

Wire it into `android/app/build.gradle`:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            shrinkResources false
        }
    }
}
```

Build and verify:

```bash
cd android
./gradlew assembleRelease      # → app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease        # → app/build/outputs/bundle/release/app-release.aab (Play Store)

$ANDROID_HOME/build-tools/35.0.0/apksigner verify --print-certs \
  app/build/outputs/apk/release/app-release.apk
adb install -r app/build/outputs/apk/release/app-release.apk
```

## 6. Icons and splash screen

```bash
npm install --save-dev @capacitor/assets
mkdir -p assets
# assets/icon.png (1024×1024) and assets/splash.png (2732×2732),
# or reuse public/icons/icon-512.png upscaled for the icon
npx @capacitor/assets generate --android
npx cap sync android
```

## 7. Android behaviour worth knowing

- **Imports persist** in the WebView's IndexedDB (app-private storage). Uninstalling the app or
  clearing app data deletes imported audio — the Settings screen offers a JSON export.
- **Screen-off playback**: a plain WebView pauses HTML5 audio when the app is backgrounded. For a
  true background player add a native audio plugin/foreground service (e.g. a Capacitor media
  session plugin) and request `FOREGROUND_SERVICE_MEDIA_PLAYBACK`; optionally add
  `@capacitor-community/keep-awake` to keep the screen on while the full-screen player is open.
- **Audio focus / hardware keys** need the same native plugin; the web Media Session integration
  only applies in a browser.
- **Permissions**: `INTERNET` is included by Capacitor. No storage permission is required —
  everything is app-scoped.
- **Cleartext HTTP** is not needed (`androidScheme: https`); keep it that way.
- **Offline** works without a service worker because the bundle ships inside the APK.
- **Play Store**: upload the `.aab`, target API 35+, provide a privacy policy (the app collects
  nothing), and make sure you own the artwork/audio you ship.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| White screen after launch | Rebuild with `VITE_DISABLE_SW=1 npm run build && npx cap sync android`; confirm `webDir` is `dist` and `base` is `/`. |
| `SDK location not found` | Create `android/local.properties` with `sdk.dir=/path/to/Android/sdk`. |
| `Unsupported class file major version` | Use JDK 21 (`java -version`), set Gradle JDK in Android Studio settings. |
| Audio silent until tapped | WebView autoplay policy — start playback from a tap (the splash "Enter with music" button does this). |
| Stale UI after deploy | You are looking at a cached web build: `npx cap sync android` and rebuild the APK. |
