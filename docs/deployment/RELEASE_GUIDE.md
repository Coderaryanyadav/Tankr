# TANKR — Multi-Platform Release & Deployment Guide

This guide details the automated build, packaging, and distribution pipeline for **TANKR** across all 5 supported platforms: **Android (APK)**, **iOS**, **macOS (DMG)**, **Windows (EXE)**, and **Web SPA**.

---

## 🚀 1. Automated GitHub Actions CI/CD Pipeline

The repository includes a production multi-platform release workflow: [`.github/workflows/release.yml`](../../.github/workflows/release.yml).

### Available Platform Packages Built by GitHub:

| Platform | Target Package | Architecture / Format | Output File | Description |
| :--- | :--- | :--- | :--- | :--- |
| **🤖 Android** | Installable APK | `arm64-v8a`, `armeabi-v7a`, `x86_64` | `tankr-android-installable.apk` | Ready for direct side-loading on Android devices |
| **🍎 iOS** | Simulator App | `arm64` / `x86_64` | `tankr-ios-simulator.zip` | Extract and drag into iOS Simulator or test harness |
| **💻 macOS** | Apple Silicon & Intel DMG | `dmg` / `zip` | `TANKR-1.0.0.dmg` | Native desktop window with offline asset caching |
| **🪟 Windows** | Windows Executable | `x64` NSIS & Portable | `TANKR Setup 1.0.0.exe` | Standalone portable executable & installer |
| **🌐 Web SPA** | Static Single Page App | Universal Web | `tankr-web-production.zip` | Deployable to Vercel, Netlify, Cloudflare Pages |

---

## ⚡ 2. How to Trigger an Automated Release

### Option A: Via GitHub CLI (`gh`)

Run the automated workflow directly from your terminal:

```bash
# Trigger the release workflow on GitHub's cloud runners
gh workflow run release.yml -f version="v1.0.0" -f release_title="TANKR v1.0.0 Production Release"
```

Monitor live build progress across all runner matrices:

```bash
gh run list --workflow=release.yml
gh run watch
```

### Option B: Via Git Release Tag

Tagging any commit with `v*` and pushing triggers the release automatically:

```bash
git tag -a v1.0.0 -m "Release v1.0.0: Android APK, iOS, macOS DMG, Windows EXE & Web"
git push origin v1.0.0
```

---

## 📱 3. Installation & Sideloading Instructions

### 🤖 Android (APK)
1. Download `tankr-android-installable.apk` from the [GitHub Releases](https://github.com/Coderaryanyadav/Tankr/releases) page.
2. Transfer or download directly to your Android device.
3. Tap the file in your File Manager or Downloads.
4. Allow *"Install Unknown Apps"* if prompted by Android security settings.
5. Launch **TANKR** from your app drawer.

### 🍎 iOS (Simulator)
1. Download `tankr-ios-simulator.zip` and extract `TANKR.app`.
2. Boot your iOS Simulator (`open -a Simulator`).
3. Drag and drop `TANKR.app` directly into the open simulator window.
4. Or run via terminal:
   ```bash
   xcrun simctl install booted TANKR.app
   xcrun simctl launch booted com.tankr.app
   ```

### 💻 macOS (DMG)
1. Download `TANKR-1.0.0.dmg`.
2. Double-click the DMG to open the disk image.
3. Drag the **TANKR** app icon into your **Applications** folder.
4. Launch TANKR from Spotlight or Launchpad.

### 🪟 Windows (EXE)
1. Download `TANKR-1.0.0.exe` (or `TANKR Setup 1.0.0.exe`).
2. Double-click to launch the standalone desktop executable.

---

## ☁️ 4. EAS Cloud Build Commands (Alternative)

If you prefer building in Expo's managed cloud via EAS CLI:

```bash
# Android APK build
npx eas-cli build --platform android --profile preview

# iOS Simulator build
npx eas-cli build --platform ios --profile preview

# All platforms in parallel
npx eas-cli build --platform all --profile preview
```
