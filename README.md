# MoneyMate 💸

MoneyMate is a self-hosted, private finance tracking and expense splitting mobile application designed for personal use, partners, roommates, and family groups.

<p align="center">
  <img src="./assests/homePage.jpeg" width="30%" alt="MoneyMate Dashboard" />
  <img src="./assests/screen1.jpeg" width="30%" alt="MoneyMate Onboarding" />
  <img src="./assests/analytics.jpeg" width="30%" alt="MoneyMate Analytics" />
</p>

## Features

- 👥 **Split Expenses**: Seamlessly split group costs, compute balances, and settle debts with a built-in debt-minimization engine.
  <br/><img src="./assests/expensesShare.jpeg" width="30%" alt="Split Expenses" />
- 📂 **Personal Finance Groups**: Maintain isolated groups for shared splitting (e.g. Home expenses) or individual private logs.
  <br/><img src="./assests/groupCreation.jpeg" width="30%" alt="Group Creation" />
- 📊 **Category Analytics**: Gain deep insights into your spending habits with clean category analytics and charts.
  <br/><img src="./assests/analytics.jpeg" width="30%" alt="Category Analytics" />
- 💰 **Saved Instead Tracker**: Build financial discipline by logging impulse spending that you resisted, tracking your self-control.
  <br/><img src="./assests/impulseControl.jpeg" width="30%" alt="Saved Instead Tracker" />
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

For customization guidance (e.g. adding more people, styling themes, or categories), see [CUSTOMIZATION.md](./docs/CUSTOMIZATION.md).

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

## Security Disclaimer

> [!IMPORTANT]
> This application is built as a **self-hosted, private finance manager**. 
> - **Authentication is intentionally not included** to facilitate direct, zero-friction usage across devices without complex login flows.
> - Access control is managed entirely by keeping your Supabase Project API URL and anon keys secret.
> - **Do not commit your `.env` file** to public repositories. Ensure that you restrict your database access if necessary.
