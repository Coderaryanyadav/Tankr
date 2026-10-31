# TANKR — Production Deployment Guide

## 1. Deployment Architecture

TANKR is distributed across two cloud infrastructures:
1. **Mobile Application**: Built and distributed via EAS (Expo Application Services) to Google Play Store (Android AAB) and Apple App Store (iOS IPA).
2. **Web Application & Admin Portal**: Deployed as a static single-page app (SPA) to Vercel, Netlify, or Cloudflare Pages.
3. **Backend & Database**: Hosted on managed Supabase Cloud (PostgreSQL 15 + PostGIS).

---

## 2. Web Deployment (Vercel / Cloudflare)

### Build Command:
```bash
npx expo export --platform web
```
Output directory: `dist/`

### Environment Variables:
Configure the following in your hosting provider's dashboard:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_RAZORPAY_KEY_ID`
- `EXPO_PUBLIC_CARTO_API_KEY`
- `EXPO_PUBLIC_MAPPLS_REST_KEY`

---

## 3. Mobile Deployment via EAS

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo account
eas login

# 3. Configure credentials
eas credentials

# 4. Trigger cloud builds
eas build --platform ios --profile production
eas build --platform android --profile production
```
