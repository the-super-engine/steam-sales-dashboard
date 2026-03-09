![Steam Sales Dashboard Cover](readme_cover.png)
# Steam Sales Dashboard

[English](README.md) | [简体中文](README_zh-CN.md)

A modern, real-time dashboard for Steam app/game developers to visualize sales data effectively.

**Build by [SODA GAME](https://soda-game.com)**

## ✨ Features

**Real-Time Monitoring**
*   **Live Metrics**: Track *Revenue (Today)*, *Units Sold (Today)*, *Total Wishlists*, and *Active Users* in real-time.
*   **Algorithmic Projections**: Get an automated prediction for today's final sales figures based on current velocity.
*   **UTC Clock**: Always know the official Steam day reset time (UTC 00:00).

**Deep Data Analysis**
*   **Sales Performance**: Interactive charts for revenue and units sold. Filter by *7 Days*, *30 Days*, *90 Days*, *1 Year*, *All Time*, or define a *Custom Date Range*.
*   **Advanced Insights**:
    *   **Heatmaps**: Visualize sales intensity across the calendar year.
    *   **Weekly Patterns**: Identify your game's best performing days of the week.
    *   **Monthly Volume**: Track long-term seasonal trends.

**Wishlist Analytics**
*   **Wishlist Flow**: Visualize daily additions versus deletions/purchases.
*   **Net Momentum**: Track the net growth rate of your wishlist count.
*   **Conversion Tracking**: Monitor outstanding wishlists and conversion events.

**Portfolio Management**
*   **Multi-App Support**: Perfect for publishers or developers with multiple titles.
*   **Global Overview**: See all your games ranked by daily performance in one unified view.

## 📖 User Manual & Operation Guide

### 1. Installation

**Supported Platforms**
*   **Windows**: Fully supported.
*   **macOS**: Fully supported.
*   **Linux**: Theoretically supported via manual build (not officially distributed).

**Download**
Get the latest version from the [Releases Page](https://github.com/the-super-engine/steam-sales-dashboard/releases).

**macOS Users**
If the app is blocked on launch, run this command in Terminal:
```bash
xattr -cr /Applications/"Steam Sales Dashboard.app"
```

---

### 2. First Launch & Login

When you open the application for the first time:
1.  You will be presented with the official **Steamworks Login** page.
2.  Please sign in with your Steam Partner credentials.
    *   *Security Note*: You are logging in directly to Valve's official website. This app uses a standard browser window to load the page. It **does not** record, store, or transmit your password.
3.  **Perform any necessary 2FA (Steam Guard) verification.**
    *   *Important*: Authentication information is stored locally only within this application. This app acts solely as a browser and does not upload any data to cloud servers or third-party relay services.

---

### 3. Using the Dashboard

Once you are logged in, the app will automatically detect your session and switch to the **Dashboard View**.

![Dashboard Screenshot](readme_screenshot.png)

**Portfolio View (For Publishers/Multi-App Developers)**
*   If your account manages multiple games, you will see the **Portfolio Dashboard**.
*   This screen shows a summary of all your apps, sorted by rank and sales.
*   **Action**: Click on any game card to view its detailed performance.

**Game Dashboard (Single App View)**
*   **Real-Time Stats**: View "Today's Revenue", "Units Sold", "Wishlists", and "Active Users" at a glance.
*   **Historical Data**: The app automatically downloads and parses your sales and wishlist CSVs from Steamworks to generate interactive charts.
*   **Projections**: See algorithmic projections for today's final sales based on current trends.

---

### 4. Updating & Refreshing

*   **Auto-Refresh**: The dashboard updates its data automatically every **5 minutes**.
*   **Manual Refresh**: Click the "Refresh" icon in the top toolbar to force an immediate update.
*   **App Updates**: The app checks for new versions on startup. If an update is available, you will see a notification with a download link.

---

### 5. Signing Out

If you need to switch accounts:
1.  Go to the **Portfolio View** (click "Back" if you are in a game view).
2.  Click the **Sign Out** button in the top-right corner.
3.  You will be returned to the Steamworks Login page.

---

## 🔒 Privacy & Security Principles

This application is designed with a "Local-First" philosophy to ensure your data remains private.

**Technical Architecture**
*   **Assistive Browsing**: This app functions essentially as a specialized local browser. It loads the official Steamworks website and provides an alternative, modernized visualization layer on top of the standard interface.
*   **Non-Intrusive**: We do not inject code into Steam's servers or modify the underlying Steamworks platform. The app simply reads the data already displayed in your browser session to generate the dashboard.
*   **No API Keys**: We do not use the Steam Web API, so no API keys or special permissions are required.
*   **Zero Data Collection**: We do not upload, aggregate, or relay any data to third-party servers. All processing happens in your local environment.

**Important Note**
Since this application relies on the structure of the Steamworks webpage:
*   If Valve updates the Steamworks UI, this dashboard may temporarily break.
*   In such cases, please wait for an update or, since the project is open-source, you can fork the code and fix the selectors yourself.

1.  **Direct Connection**: The app acts as a specialized web browser. It communicates **only** with `partner.steampowered.com`.
2.  **No Cloud Storage**: Your sales data, revenue figures, and player counts are processed **100% locally** on your computer's RAM and disk. Nothing is uploaded to our servers or any third-party cloud.
    *   **Authentication**: Your login credentials and cookies are stored only on your local machine, just like a regular web browser. We do not have access to them.
3.  **Open Source**: The full source code is available for audit. You can build it yourself if you prefer not to use pre-compiled binaries.

---

## Development

### Prerequisites
- Node.js (v20 or later)
- npm

### Setup
```bash
git clone https://github.com/the-super-engine/steam-sales-dashboard.git
npm install
npm run dev
```

### Build
```bash
npm run build
```

## Tech Stack
- **Electron**: Cross-platform desktop framework
- **React**: UI library
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **Recharts**: Data visualization

## License
MIT

## Credits
Powered by [Soda Game](https://soda-game.com) & [Vibart AI](https://vibart.ai)

This App 99.99% Written by [TRAE AI](https://www.trae.ai/)
