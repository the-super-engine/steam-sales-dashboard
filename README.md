# Steam Sales Dashboard

A modern, real-time dashboard for Steam app/game developers to visualize sales data effectively.

## Introduction & How It Works

**What is this app?**
This application is a specialized dashboard designed to give Steam developers a better way to visualize their sales and wishlist data. Instead of manually downloading CSV reports from Steamworks and creating charts in Excel, this app automates the process and presents your data in a beautiful, real-time interface.

**How does it work?**
The application operates on a simple, secure principle:
1.  **Background Browser**: It runs a standard web browser in the background (hidden from view) that navigates to the official Steamworks website.
2.  **Local Data Fetching**: Once you log in to Steamworks in this background browser, the app detects your session and automatically downloads the necessary sales and wishlist CSV files directly from Steam.
3.  **Local Processing**: It parses these files instantly on your computer to generate the charts and metrics you see.

**Privacy & Security**
*   **100% Local**: All data processing happens locally on your machine.
*   **No Cloud Uploads**: Your sales data, credentials, and cookies are **never** sent to any third-party server or cloud storage.
*   **Direct Connection**: The app communicates directly between your computer and Steam's servers, just like your regular web browser.

## Features

- **Real-time Monitoring**: Track sales, revenue, and wishlists in real-time.
- **Multi-App Support**: Monitor multiple Steam apps from a single dashboard.
- **Launch Day Ready**: Designed for big screens to visualize launch day performance.
- **Local & Secure**: Runs completely locally, keeping your sensitive sales data safe.
- **Cross-Platform**: Available for Windows and macOS.

## Installation

Download the latest release from the [Releases Page](https://github.com/the-super-engine/steam-sales-dashboard/releases).

### macOS Users (Important)

Since the application is not signed with an Apple Developer Certificate (to keep it free and open source), you may see a warning when opening it. To bypass this:

1. Move the app to your `Applications` folder.
2. Open Terminal and run the following command:

```bash
xattr -cr /Applications/"Steam Sales Dashboard.app"
```

3. Open the app as usual.

## Development

### Prerequisites

- Node.js (v20 or later)
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/the-super-engine/steam-sales-dashboard.git

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build

```bash
npm run build
```

## Tech Stack

- **Electron**: Cross-platform desktop framework
- **React**: UI library
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling
- **Recharts**: Data visualization

## License

MIT

## Credits

Powered by [Soda Game](https://soda-game.com) & [Vibart AI](https://vibart.ai)
