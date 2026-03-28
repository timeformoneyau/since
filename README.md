# Since

> Know how long it's been.

Track the things you don't do often enough. Since keeps count for you.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Add placeholder assets (required by Expo)

Expo expects icon/splash images. Generate minimal ones:

```bash
# Install expo-asset generator or just copy any 1024x1024 PNG to:
# assets/icon.png
# assets/splash.png
# assets/adaptive-icon.png
# assets/favicon.png
#
# Quick way — use the Expo default assets from a fresh project,
# or run: npx expo install expo-asset and copy from node_modules/expo/assets/
```

Or run the app and let Expo warn — it will still launch.

### 3. Run on Android

Make sure you have:
- Android Studio installed (for the emulator) OR
- Expo Go installed on your physical Android device

**Physical device (recommended for testing):**

```bash
npx expo start
```

Then scan the QR code with Expo Go on your phone. Both must be on the same WiFi network.

**Android emulator:**

```bash
npx expo start --android
```

### 4. Build an APK for direct install

```bash
# Install EAS CLI if you haven't
npm install -g eas-cli

# Log in to Expo account (free)
eas login

# Configure the build
eas build:configure

# Build a local preview APK (no Expo account needed for local builds)
npx expo run:android
```

Or for a shareable APK via EAS:

```bash
eas build --platform android --profile preview
```

## Package install command (full)

```bash
npm install
```

All dependencies are in package.json. Key ones:
- `expo` ~51
- `react-native` 0.74
- `@react-navigation/native` + `@react-navigation/native-stack`
- `@react-native-async-storage/async-storage`
- `expo-notifications`
- `date-fns` ^3
- `uuid` ^10

## Folder structure

```
since/
├── App.tsx                    # Root: navigation setup + notification permission request
├── src/
│   ├── types/
│   │   └── index.ts           # SinceItem, StatusLabel, RootStackParamList, etc.
│   ├── storage/
│   │   └── items.ts           # AsyncStorage CRUD helpers
│   ├── utils/
│   │   ├── dateUtils.ts       # Date math: daysSince, nextDueDate, formatting
│   │   ├── statusUtils.ts     # Status computation, sort order, secondary line text
│   │   └── suggestions.ts     # Keyword → suggested repeat interval
│   ├── notifications/
│   │   └── scheduler.ts       # Schedule/cancel per-item notifications
│   └── components/
│       ├── colours.ts         # Colour palette + statusColour()
│       ├── ItemCard.tsx       # Swipeable list card with Done button
│       ├── DatePickerModal.tsx # Scroll-wheel date picker (no native deps)
│       └── CategoryPicker.tsx # Bottom-sheet category picker
│   └── screens/
│       ├── MainListScreen.tsx # Empty state + sorted item list
│       ├── AddItemScreen.tsx  # Add form with smart suggestions
│       └── EditItemScreen.tsx # Edit form with delete
```
