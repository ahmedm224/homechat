# ChatHome Mobile

React Native mobile app for ChatHome, built with Expo.

## Tech Stack

- **React Native** with TypeScript
- **Expo** (SDK 52)
- **Expo Router** - File-based navigation
- **Expo SecureStore** - Secure token storage
- **Expo Image Picker** - Photo attachments
- **Expo Document Picker** - File attachments

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

```bash
cd mobile
npm install
```

### Development

```bash
# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### Building for Production

#### Android APK (for testing)

```bash
eas build --platform android --profile preview
```

#### Android App Bundle (for Play Store)

```bash
eas build --platform android --profile production
```

#### iOS (requires Apple Developer account)

```bash
eas build --platform ios --profile production
```

## Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Splash/redirect
│   ├── login.tsx           # Login screen
│   ├── chat.tsx            # Conversation list
│   └── conversation/
│       └── [id].tsx        # Chat screen
├── src/
│   ├── components/         # Reusable components
│   │   ├── ChatInput.tsx
│   │   └── MessageBubble.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx # Authentication state
│   ├── hooks/
│   │   └── useChat.ts      # Chat state management
│   ├── lib/
│   │   └── api.ts          # API client
│   └── theme/
│       ├── colors.ts       # Color definitions
│       └── ThemeContext.tsx
├── assets/                 # App icons and images
├── app.json                # Expo config
├── eas.json                # EAS Build config
└── package.json
```

## Features

- JWT authentication with secure storage
- Real-time chat with streaming responses
- Fast and Thinking AI modes
- Image and document attachments
- Dark/Light theme support
- Pull-to-refresh conversations
- Long-press to delete conversations

## Android Studio Setup

1. Generate native Android project:
   ```bash
   npx expo prebuild --platform android
   ```

2. Open in Android Studio:
   - Open Android Studio
   - Select "Open an existing project"
   - Navigate to `mobile/android`

3. Run from Android Studio:
   - Select your device/emulator
   - Click Run

## Assets Setup

Before building, replace placeholder assets:

- `assets/icon.png` - App icon (1024x1024)
- `assets/splash.png` - Splash screen (1284x2778)
- `assets/adaptive-icon.png` - Android adaptive icon (1024x1024)
- `assets/favicon.png` - Web favicon (48x48)

## Environment

The API URL is hardcoded in `src/lib/api.ts`. For different environments, update:

```typescript
const API_URL = 'https://chathome-api.just-ahmed.workers.dev'
```

## License

Private - All rights reserved.
