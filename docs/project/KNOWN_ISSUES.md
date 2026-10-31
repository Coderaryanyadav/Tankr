# TANKR — Known Issues & Workarounds

This document tracks known limitations and current engineering workarounds.

---

## 1. Local Supabase Docker Daemon Offline

- **Issue**: Running `npx supabase start` fails if Docker Desktop is not running on the host.
- **Workaround**: Developers without Docker can point their `.env` to a free Supabase Cloud project (`https://your-ref.supabase.co`). All client features and migrations operate identically.

---

## 2. Native Mappls SDK Requires Expo Development Build

- **Issue**: The Mappls native SDK config plugin requires native iOS/Android code and cannot run inside standard Expo Go.
- **Workaround**: For rapid local testing, run the application in web mode (`./scripts/start-dev.sh web`), which runs the web mapping engine without requiring Xcode or Android Studio.

---

## 3. SMS Gateway in Development

- **Issue**: Real SMS delivery requires paid Twilio/MessageBird credentials.
- **Workaround**: Use the pre-configured test phone numbers with OTP `123456` (documented in [Troubleshooting](../setup/TROUBLESHOOTING.md)).
