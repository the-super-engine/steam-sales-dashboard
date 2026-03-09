# Steam Sales Dashboard

![Steam Sales Dashboard Cover](readme_cover.png)

A modern, real-time dashboard for Steam app/game developers to visualize sales data effectively.

## 📖 User Manual & Operation Guide

### 1. Installation

**Download**
Get the latest version from the [Releases Page](https://github.com/the-super-engine/steam-sales-dashboard/releases).

**macOS Users (Important)**
Because this app is open-source and not signed with a paid Apple Developer Certificate, macOS may block it by default. To fix this:
1.  Move the `Steam Sales Dashboard.app` to your **Applications** folder.
2.  Open the **Terminal** app.
3.  Paste and run this command:
    ```bash
    xattr -cr /Applications/"Steam Sales Dashboard.app"
    ```
4.  You can now open the app normally.

---

### 2. First Launch & Login

When you open the application for the first time:
1.  You will be presented with the official **Steamworks Login** page.
2.  Please sign in with your Steam Partner credentials.
    *   *Security Note*: You are logging in directly to Valve's official website. This app uses a standard browser window to load the page. It **does not** record, store, or transmit your password.
3.  Perform any necessary 2FA (Steam Guard) verification.

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

1.  **Direct Connection**: The app acts as a specialized web browser. It communicates **only** with `partner.steampowered.com`.
2.  **No Cloud Storage**: Your sales data, revenue figures, and player counts are processed **100% locally** on your computer's RAM and disk. Nothing is uploaded to our servers or any third-party cloud.
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
