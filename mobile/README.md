# UrbanKetl Mobile App

React Native mobile application for UrbanKetl tea machine management platform, built with Expo.

## Features

- 🔐 **Authentication** - Secure login with session-based auth
- 💰 **Wallet Management** - View balance and recharge across business units
- 📊 **Transaction History** - Track all recharges and tea purchases
- 🏢 **Business Units** - Manage multiple business unit wallets
- 📱 **Push Notifications** - Get notified about wallet updates
- 📷 **QR Scanner** - Scan QR codes for quick actions
- 👤 **Profile Management** - Update preferences and settings

## Prerequisites

- Node.js 18+ installed
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- The UrbanKetl backend server running (from the parent directory)

## Setup

### 1. Install Dependencies

From the `/mobile` directory:

```bash
cd mobile
npm install
```

### 2. Configure API Endpoint

The app is pre-configured to connect to `http://localhost:5000` in development.

If your backend runs on a different port, update `mobile/src/config/constants.ts`:

```typescript
export const API_BASE_URL = 'http://localhost:YOUR_PORT';
```

**Important for physical devices**: Replace `localhost` with your computer's local IP address:
```typescript
export const API_BASE_URL = 'http://192.168.1.XXX:5000';
```

Find your IP:
- **macOS/Linux**: Run `ifconfig` and look for `inet` under your network interface
- **Windows**: Run `ipconfig` and look for `IPv4 Address`

### 3. Start the Backend Server

From the project root directory:

```bash
npm run dev
```

This starts the Express backend on port 5000.

### 4. Start the Mobile App

From the `/mobile` directory:

```bash
npm start
```

This will start the Expo development server and show a QR code.

### 5. Open on Your Device

1. Open the **Expo Go** app on your phone
2. Scan the QR code shown in your terminal
3. The app will load on your device

## Development

### Running on Different Platforms

```bash
# iOS Simulator (macOS only)
npm run ios

# Android Emulator
npm run android

# Web browser (for testing)
npm run web
```

### Project Structure

```
mobile/
├── src/
│   ├── config/
│   │   └── constants.ts         # App configuration
│   ├── screens/
│   │   ├── HomeScreen.tsx       # Dashboard with quick actions
│   │   ├── WalletScreen.tsx     # Wallet recharge
│   │   ├── HistoryScreen.tsx    # Transaction history
│   │   ├── ProfileScreen.tsx    # User profile
│   │   ├── LoginScreen.tsx      # Authentication
│   │   ├── QRScannerScreen.tsx  # QR code scanner
│   │   └── SplashScreen.tsx     # Loading screen
│   └── services/
│       ├── AuthService.tsx      # Authentication logic
│       └── NotificationService.ts # Push notifications
├── App.tsx                      # Main app with navigation
├── app.json                     # Expo configuration
└── package.json                 # Dependencies
```

## Authentication

The mobile app uses **session-based authentication** with cookies, matching the web app's auth system:

- Login credentials are sent to `/api/login`
- User info is fetched from `/api/auth/user`
- Logout is handled via `/api/logout`
- All API requests use `credentials: 'include'` to send session cookies
- Session cookies are automatically managed by React Native's fetch API
- Sessions persist until logout or expiration

### Backend Requirements

The backend must be configured to accept cross-origin requests with credentials. The UrbanKetl backend is already configured with CORS, but ensure your setup includes:

```typescript
// In your Express app setup (already configured in UrbanKetl):
app.use(cors({
  origin: true, // Accepts all origins (development mode)
  credentials: true // Required for session cookies
}));
```

### Session Cookie Limitations on Physical Devices

**Important**: HTTP session cookies have limitations when testing on physical devices:

1. **Same Network Required**: Your phone and computer must be on the same WiFi
2. **HTTP vs HTTPS**: Session cookies work on HTTP for localhost, but physical devices accessing your computer's IP (e.g., `192.168.1.XXX`) may have cookie restrictions
3. **Cookie Storage**: React Native's fetch API handles cookies automatically with `credentials: 'include'`

**If you experience login issues on physical devices:**

Option 1: Use iOS Simulator or Android Emulator (recommended for development)
```bash
npm run ios      # macOS only
npm run android  # Requires Android Studio
```

Option 2: Use a tunneling service for HTTPS (for physical device testing)
```bash
# Install ngrok
npm install -g ngrok

# Tunnel your local server
ngrok http 5000

# Update mobile/src/config/constants.ts with the ngrok URL:
export const API_BASE_URL = 'https://YOUR-NGROK-URL.ngrok.io';
```

With HTTPS via ngrok, session cookies will work reliably on physical devices.

### Important for Mobile Devices

When testing on a physical device:
1. **Update API_BASE_URL** with your computer's IP address (not `localhost`)
2. **Ensure same network** - Your phone and computer must be on the same WiFi
3. **Check firewall** - Port 5000 should be accessible from your local network

**Test Accounts**: Use the same accounts from the web app.

## Building for Production

### Prerequisites

- Expo account (free at [expo.dev](https://expo.dev))
- For iOS: Apple Developer Account ($99/year)
- For Android: Google Play Developer Account ($25 one-time)

### Build with EAS

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure the project**:
   ```bash
   eas build:configure
   ```

4. **Update production URL** in `src/config/constants.ts`:
   ```typescript
   export const API_BASE_URL = process.env.NODE_ENV === 'development'
     ? 'http://192.168.1.XXX:5000'
     : 'https://your-published-backend-url.replit.app';
   ```

5. **Build for iOS**:
   ```bash
   eas build --platform ios
   ```

6. **Build for Android**:
   ```bash
   eas build --platform android
   ```

7. **Submit to stores**:
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

## Troubleshooting

### Cannot connect to backend

1. Ensure the backend server is running (`npm run dev` from project root)
2. Check that `API_BASE_URL` uses your computer's IP address, not `localhost`
3. Make sure your phone and computer are on the same WiFi network
4. Disable any VPNs or firewalls blocking local connections

### "Network request failed" errors

- The mobile app needs access to your computer's local network
- Update `API_BASE_URL` to use your computer's IP address instead of `localhost`
- Ensure port 5000 is not blocked by your firewall

### Camera permissions not working

- Open your device Settings > UrbanKetl > Enable Camera permission
- On iOS, camera permissions only work on physical devices, not simulators

### Push notifications not working

- Push notifications require physical devices
- Expo Go has limited notification support; use a development build for full functionality
- For production, notifications work fully after building with EAS

## API Endpoints Used

- `POST /api/login` - User login (session-based)
- `POST /api/logout` - User logout (destroys session)
- `GET /api/auth/user` - Get current authenticated user
- `GET /api/business-units` - List user's business units
- `GET /api/transactions` - Transaction history
- `POST /api/payments/create-order` - Create Razorpay recharge order
- `POST /api/notifications/register` - Register push notification token

All endpoints use `credentials: 'include'` to send session cookies.

## Next Steps

1. **Connect to Production Backend**: Publish your Express backend and update `API_BASE_URL`
2. **Enable Razorpay**: Integrate Razorpay SDK for mobile payments
3. **Add More Features**: RFID card management, machine finder, etc.
4. **Customize Branding**: Update colors, icons, and splash screen in `app.json`

## Support

For issues or questions:
- Check the main project README
- Review backend API documentation
- Contact your system administrator
