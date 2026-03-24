# OS Mini — iOS Build Guide

## Prerequisites
- Apple Developer Account ($99/year) — https://developer.apple.com
- EAS CLI installed (already done): `npm install -g eas-cli`
- Expo account (free) — `eas login`

## One-Time Setup

### 1. Login to Expo
```bash
eas login
```

### 2. Login to Apple (when prompted during build)
EAS will ask for your Apple ID and password during the first build.
It handles certificates and provisioning profiles automatically.

### 3. Update eas.json with Apple credentials
Edit `eas.json` → `submit.production.ios`:
```json
{
  "appleId": "your@apple-id-email.com",
  "ascAppId": "your-app-store-connect-app-id",
  "appleTeamId": "your-team-id"
}
```

## Build Commands

### Preview build (internal testing — no App Store)
```bash
cd os-browser-mobile
eas build --platform ios --profile preview
```

### Production build (App Store / TestFlight)
```bash
cd os-browser-mobile
eas build --platform ios --profile production
```

### Build both platforms at once
```bash
eas build --platform all --profile production
```

## After Build
- EAS provides a download link for the `.ipa` file
- Upload to TestFlight: `eas submit --platform ios`
- Or manually upload via Transporter app on Mac

## Submit to App Store
```bash
eas submit --platform ios --profile production
```

## Important Notes
- First build takes ~15 min (free tier) or ~5 min (paid)
- EAS auto-manages iOS certificates — no manual Xcode config needed
- Bundle ID: `work.askozzy.osmini`
- App category: Utilities (helps avoid "browser duplicate" rejection)
- `ITSAppUsesNonExemptEncryption: false` is set — avoids export compliance questions
