# MoneyMate 💸

MoneyMate is a self-hosted, private finance tracking and expense splitting mobile application designed for personal use, partners, roommates, and family groups.

## Features

- 👥 **Split Expenses**: Seamlessly split group costs, compute balances, and settle debts with a built-in debt-minimization engine.
- 📂 **Personal Finance Groups**: Maintain isolated groups for shared splitting (e.g. Home expenses) or individual private logs.
- 📊 **Category Analytics**: Gain deep insights into your spending habits with clean category analytics and charts.
- 💰 **Saved Instead Tracker**: Build financial discipline by logging impulse spending that you resisted, tracking your self-control.
- 📱 **Android Native Widgets**: Track your group balance directly on your phone's home screen with modern Android widgets.

## Tech Stack

- **Framework**: React Native Expo (TypeScript)
- **Styling**: NativeWind (TailwindCSS in React Native)
- **Database / Backend**: Supabase (PostgreSQL database & real-time sync wrapper)
- **Home Screen Widgets**: Android Native Widgets (`react-native-android-widget` bridge)

---

## Getting Started

Follow these steps to set up the app and build your custom package.

### Prerequisites

Ensure you have the following installed:
- Node.js (v18 or newer)
- npm or yarn
- Expo CLI (`npx expo`)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/MoneyMate.git
cd MoneyMate
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Supabase Backend

To configure your database backend:
1. Create a Supabase project and fetch your API details.
2. Initialize the PostgreSQL schema in the SQL Editor.
3. Configure your environment variables in a `.env` file.

See the detailed guide at [SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md).

### 4. Run Locally

Start the Expo development server:

```bash
npx expo start
```

Press `a` to run on an Android emulator/device or `i` to run on an iOS simulator.

### 5. Build the Android APK

To generate a standalone Android APK:

1. Log in or create an account with Expo Application Services (EAS):
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Configure the project:
   ```bash
   eas build:configure
   ```
3. Run the local build script to produce a build (or use EAS cloud builders):
   ```bash
   eas build --platform android --profile preview
   ```
   This will output a downloadable `.apk` file that you can install directly on any Android device.

---

## 🔐 Privacy & Data Ownership

MoneyMate is designed as a self-hosted personal finance tracker.

Unlike traditional apps where your financial data lives on a company's servers, MoneyMate lets you connect your own Supabase database.

Authentication is intentionally not included in the default setup because the app is designed for:

- personal use
- couples
- small trusted groups
- self-hosted deployments

Every user creates their own:
- Supabase project
- database
- environment variables

Your data stays in your own infrastructure.

If you plan to expose this as a public app, adding Supabase Auth + Row Level Security is recommended.

## Security Disclaimer

> [!IMPORTANT]
> This application is built as a **self-hosted, private finance manager**. 
> - **Authentication is intentionally not included** to facilitate direct, zero-friction usage across devices without complex login flows.
> - Access control is managed entirely by keeping your Supabase Project API URL and anon keys secret.
