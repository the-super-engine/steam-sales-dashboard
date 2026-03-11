import { app, BrowserWindow, BrowserView, ipcMain, shell, net, globalShortcut, type WebContents } from 'electron'
import path from 'path'
import fs from 'fs'
import { parse } from 'csv-parse/sync'

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js
// │ ├─┬ preload
// │ │ └── index.js
// │ ├─┬ renderer
// │ │ └── index.html

process.env.DIST_ELECTRON = path.join(__dirname, '../dist-electron')
process.env.DIST = path.join(__dirname, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

let win: BrowserWindow | null = null
let steamView: BrowserView | null = null

const STEAM_ROOT_URL = 'https://partner.steampowered.com/'
const STEAM_ALL_APPS_URL = 'https://partner.steampowered.com/nav_games.php'
const TARGET_URL_PATTERN = /partner\.steampowered\.com\/app\/details\/(\d+)/
const ALL_PRODUCTS_PATTERN = /partner\.steampowered\.com\/nav_games\.php(?:\?|$)/

let backgroundView: BrowserView | null = null
let autoOpenedOnLaunch = false

function createWindow() {
  const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png'
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false, // Prevent black screen on Windows: show only after content is ready
    icon: path.join(process.env.PUBLIC ?? '', iconName),
    webPreferences: {
      preload: path.join(__dirname, '../dist-electron/preload.js'),
      nodeIntegration: true,
      contextIsolation: false, // For easier IPC in this prototype
    },
    backgroundColor: '#000000', // Dark background for dashboard feel
    titleBarStyle: 'hiddenInset', // Native-like dark bar on macOS
    trafficLightPosition: { x: 12, y: 12 }
  })

  // On Windows, showing before render is ready causes black screen. Show only after first paint.
  const showWindowWhenReady = () => {
    if (!win || win.isDestroyed()) return
    // Re-apply Steam view bounds so they're correct when window is shown (Windows layout timing)
    if (steamView && !steamView.webContents.isDestroyed() && !dashboardActive) {
      const bounds = win.getContentBounds()
      if (bounds.width > 0 && bounds.height > 0) {
        steamView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height })
      }
    }
    win.show()
  }
  win.once('ready-to-show', showWindowWhenReady)
  // Fallback: if ready-to-show never fires (e.g. load error on Windows), show after delay
  setTimeout(showWindowWhenReady, 8000)

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Hide the menu bar
  win.setMenuBarVisibility(false)

  // Test active push message to Renderer-process
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
    // Send current visibility state to ensure renderer is in sync
    win?.webContents.send('dashboard-visibility', dashboardActive)
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    // win.webContents.openDevTools()
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST ?? '', 'index.html'))
  }

  // Create the Steam BrowserView
  createSteamView()
  
  // Create background fetcher view (hidden)
  createBackgroundView()
}

function createBackgroundView() {
    if (!win) return
    backgroundView = new BrowserView({
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    })
    // Do not attach to window, or attach with 0 size
    // win.setBrowserView(backgroundView) // If we don't attach, it might not render/execute JS? 
    // Electron docs say BrowserView must be attached to be "active" sometimes, but usually it works if just created. 
    // However, to be safe, let's attach it but hide it.
    // Actually, we can just use off-screen rendering or just a 0x0 view.
    // But we already have steamView attached. We can have multiple views.
    // Let's defer attaching until we need to use it, or attach it behind everything.
    
    // Simpler approach: Just keep it created. If execution fails, we'll attach it.
}

function createSteamView() {
  if (!win) return

  steamView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, '../dist-electron/steam-preload.js'),
      nodeIntegration: true, // Enable Node for preload to use ipcRenderer easily
      contextIsolation: false, // Allow direct access
      sandbox: false, // Disable sandbox to ensure Node APIs work
      // partition: 'persist:steam', // Keep session
    }
  })

  // Set User Agent to avoid being blocked or getting weird responses
  steamView.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

  win.setBrowserView(steamView)
  
  // Initial bounds - full window
  const bounds = win.getContentBounds()
  steamView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height })
  
  // Resize handling
  win.on('resize', () => {
    if (steamView && !dashboardActive) {
      const bounds = win?.getContentBounds()
      if (bounds) {
        steamView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height })
      }
    }
  })

  // Load Steam root first so unauthenticated users are redirected to login properly
  steamView.webContents.loadURL(STEAM_ROOT_URL)

  steamView.webContents.on('did-finish-load', () => {
    // We check URL on finish load
    checkUrl()
  })

  steamView.webContents.on('did-navigate', () => {
    // Also check on navigation
    checkUrl()
  })

  steamView.webContents.on('did-navigate-in-page', () => {
    // And in-page navigation
    checkUrl()
  })

  // Handle load errors
  steamView.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) return
      console.error('Steam View failed to load:', errorCode, errorDescription, validatedURL)
      if (errorCode === -3) return
      setDashboardVisibility(false)
      setTimeout(() => {
          if (!steamView || steamView.webContents.isDestroyed()) return
          steamView.webContents.loadURL(STEAM_ROOT_URL)
      }, 1500)
  })
}

let dashboardActive = false
let activeWishlistDownloadToken = 0
let attemptedAllAppsRedirect = false

async function checkUrl() {
  if (!steamView || steamView.webContents.isDestroyed()) return
  const url = steamView.webContents.getURL()
  console.log('Current URL:', url)

  if (url.includes('/login/') || url.includes('login.steampowered.com')) {
    console.log('Login page detected. Hiding Dashboard to allow login.')
    setDashboardVisibility(false)
    autoOpenedOnLaunch = false
    attemptedAllAppsRedirect = false
    win?.webContents.send('steam-target-detected', false)
    return
  }

  if (url === STEAM_ROOT_URL || url.startsWith(`${STEAM_ROOT_URL}home`)) {
    console.log('Steam root/home detected.')
    setDashboardVisibility(false)
    autoOpenedOnLaunch = false
    if (!attemptedAllAppsRedirect && steamView && !steamView.webContents.isDestroyed()) {
      attemptedAllAppsRedirect = true
      steamView.webContents.loadURL(STEAM_ALL_APPS_URL)
    }
    return
  }

  const isTarget = TARGET_URL_PATTERN.test(url)
  const isAllProducts = ALL_PRODUCTS_PATTERN.test(url)

  console.log(`URL Analysis: isTarget=${isTarget}, isAllProducts=${isAllProducts}`)

  if (isTarget) {
    attemptedAllAppsRedirect = false
    console.log('Target URL detected! Showing Dashboard option.')
    scrapeData()
    // Inject the Launch Dashboard button into the Steam page
    console.log('Sending show-dashboard-button to Steam View')
    setTimeout(() => {
        if (!steamView || steamView.webContents.isDestroyed()) return
        steamView.webContents.send('show-dashboard-button', true)
    }, 500)

    // Start auto-refresh interval if not already started
    startAutoRefresh()

    // Extract App ID and notify renderer
    const match = url.match(/app\/details\/(\d+)/)
    const appId = match ? match[1] : null
    win?.webContents.send('steam-target-detected', appId)

    // Trigger history fetch; fetchWishlist is called after history completes to avoid backgroundView race
    if (appId) {
        fetchHistory(appId);
    }
  } else if (isAllProducts) {
    const inspection = await steamView.webContents.executeJavaScript(`
      (function() {
        const text = (document.body && document.body.innerText ? document.body.innerText : '').toLowerCase()
        const gameLinks = document.querySelectorAll('a[href*="/app/details/"]').length
        const hasNotFound = text.includes('file not found') || text.includes('not found')
        return { gameLinks, hasNotFound }
      })()
    `).catch(() => ({ gameLinks: 0, hasNotFound: false }))
    if (inspection.hasNotFound || inspection.gameLinks === 0) {
      setDashboardVisibility(false)
      autoOpenedOnLaunch = false
      win?.webContents.send('steam-target-detected', false)
      if (url.includes('/nav_games.php') && steamView && !steamView.webContents.isDestroyed()) {
        steamView.webContents.loadURL(STEAM_ROOT_URL)
      }
      return
    }
    attemptedAllAppsRedirect = false
     console.log('All Products URL detected! Showing Portfolio Dashboard.')
     fetchPortfolioToday()
    console.log('Sending show-dashboard-button to Steam View for Portfolio')
    setTimeout(() => {
        if (!steamView || steamView.webContents.isDestroyed()) return
        steamView.webContents.send('show-dashboard-button', true)
    }, 500)
    win?.webContents.send('steam-target-detected', 'portfolio')
    if (!autoOpenedOnLaunch) {
      console.log('Auto-opening dashboard for Portfolio view')
      autoOpenedOnLaunch = true
      setDashboardVisibility(true)
    }
    
    // We can fetch history for all games too?
    // Maybe later.
  } else {
    console.log('No matching pattern. Keeping dashboard hidden.')
    win?.webContents.send('steam-target-detected', false)
  }
}

const FETCH_COOLDOWN = 3 * 60 * 60 * 1000; // 3 hours: use cache within this window, skip re-download
const HISTORY_FILE = path.join(app.getPath('userData'), 'steam-history.json');
const WISHLIST_FILE = path.join(app.getPath('userData'), 'steam-wishlist.json');
const PLAYTIME_FILE = path.join(app.getPath('userData'), 'steam-playtime.json');
const PLAYERS_FILE = path.join(app.getPath('userData'), 'steam-players.json');
const PORTFOLIO_TODAY_FILE = path.join(app.getPath('userData'), 'steam-portfolio-today.json');
const PORTFOLIO_ALLHISTORY_FILE = path.join(app.getPath('userData'), 'steam-portfolio-allhistory.json');

type PlaytimeRetentionRow = { threshold: string; minutes: number; percentage: number }
type PlaytimeData = {
  lifetimeUsers: number
  avgMinutes: number
  medianMinutes: number
  rangeMinStr: string
  rangeMaxStr: string
  retention: PlaytimeRetentionRow[]
}

function loadPlaytimeStore(): Record<string, { lastUpdated: number; data: PlaytimeData }> {
  try {
    if (fs.existsSync(PLAYTIME_FILE)) return JSON.parse(fs.readFileSync(PLAYTIME_FILE, 'utf-8'))
  } catch { /* ignore */ }
  return {}
}

function savePlaytimeStore(store: Record<string, { lastUpdated: number; data: PlaytimeData }>) {
  try { fs.writeFileSync(PLAYTIME_FILE, JSON.stringify(store, null, 2)) } catch { /* ignore */ }
}

/** Parse "X hours Y minutes" or "Y minutes" into total minutes */
function parseMinutes(text: string): number {
  const t = (text || '').trim()
  const h = t.match(/(\d+)\s*hour/i)
  const m = t.match(/(\d+)\s*min/i)
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0)
}

function fetchPlaytime(appId: string) {
  if (!backgroundView) { createBackgroundView(); if (!backgroundView) return }
  const now = Date.now()
  const store = loadPlaytimeStore()
  const cached = store[appId]
  if (cached && cached.data && (now - cached.lastUpdated < FETCH_COOLDOWN)) {
    console.log(`[playtime] Serving cached data for ${appId} — triggering players`)
    win?.webContents.send('steam-playtime-update', { appId, playtime: cached.data })
    fetchPlayers(appId)
    return
  }

  if (win) {
    win.addBrowserView(backgroundView)
    backgroundView.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  }
  const url = `https://partner.steampowered.com/app/playtime/${appId}/`
  console.log(`[playtime] Fetching ${url}`)
  backgroundView.webContents.removeAllListeners('did-finish-load')
  backgroundView.webContents.loadURL(url)
  backgroundView.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      try {
        if (!backgroundView || backgroundView.webContents.isDestroyed()) return
        const result = await backgroundView.webContents.executeJavaScript(`
          (function() {
            const getText = (el) => (el ? (el.innerText || el.textContent || '').trim() : '')
            // Key stats table (first table)
            let lifetimeUsers = 0, avgTime = '', medianTime = '', rangeMin = '', rangeMax = ''
            const tables = document.querySelectorAll('table')
            const firstTb = tables[0]
            if (firstTb) {
              const rows = firstTb.querySelectorAll('tr')
              for (const row of rows) {
                const tds = row.querySelectorAll('td')
                if (tds.length < 2) continue
                const label = getText(tds[0]).toLowerCase()
                const val = getText(tds[1])
                if (label.includes('lifetime users')) lifetimeUsers = parseInt(val.replace(/,/g,'')) || 0
                else if (label.includes('average time')) avgTime = val
                else if (label.includes('median time')) medianTime = val
                else if (label.includes('time played range')) rangeMin = val
              }
              // The range max is on the next row (empty label)
              for (let i = 0; i < rows.length - 1; i++) {
                const tds = rows[i].querySelectorAll('td')
                if (tds.length >= 1 && getText(tds[0]).toLowerCase().includes('time played range')) {
                  const nextTds = rows[i+1]?.querySelectorAll('td') || []
                  if (nextTds.length >= 2) rangeMax = getText(nextTds[1])
                }
              }
            }
            // Retention table (second table with thead)
            const retention = []
            for (const table of tables) {
              const thead = table.querySelector('thead')
              if (!thead) continue
              const bodyRows = table.querySelectorAll('tbody tr')
              for (const row of bodyRows) {
                const tds = row.querySelectorAll('td')
                if (tds.length < 2) continue
                const threshold = getText(tds[0])
                const pct = parseInt(getText(tds[1]).replace('%','')) || 0
                retention.push({ threshold, percentage: pct })
              }
              break
            }
            return { lifetimeUsers, avgTime, medianTime, rangeMin, rangeMax, retention }
          })()
        `)
        if (!result || !result.lifetimeUsers) {
          console.error('[playtime] Failed to parse playtime page for', appId)
          return
        }
        // Convert threshold strings to minutes for charting
        const thresholdMinutes: Record<string, number> = {
          '10 minutes': 10, '30 minutes': 30, '1 hour 0 minutes': 60,
          '2 hours 0 minutes': 120, '5 hours 0 minutes': 300,
          '10 hours 0 minutes': 600, '20 hours 0 minutes': 1200,
          '50 hours 0 minutes': 3000, '100 hours 0 minutes': 6000,
        }
        const retention: PlaytimeRetentionRow[] = (result.retention || []).map((r: { threshold: string; percentage: number }) => ({
          threshold: r.threshold,
          minutes: thresholdMinutes[r.threshold] ?? parseMinutes(r.threshold),
          percentage: r.percentage,
        }))
        const data: PlaytimeData = {
          lifetimeUsers: result.lifetimeUsers,
          avgMinutes: parseMinutes(result.avgTime),
          medianMinutes: parseMinutes(result.medianTime),
          rangeMinStr: result.rangeMin,
          rangeMaxStr: result.rangeMax,
          retention,
        }
        store[appId] = { lastUpdated: Date.now(), data }
        savePlaytimeStore(store)
        console.log(`[playtime] Saved playtime for ${appId}: users=${data.lifetimeUsers} avg=${data.avgMinutes}m median=${data.medianMinutes}m retention=${retention.length} rows`)
        win?.webContents.send('steam-playtime-update', { appId, playtime: data })
        // Chain players fetch after playtime (serial to avoid backgroundView race)
        fetchPlayers(appId)
      } catch (e) {
        console.error('[playtime] Error:', e)
        fetchPlayers(appId)
      }
    }, 2000)
  })
}

type PlayerHistoryPoint = { date: string; value: number }
type PlayerSummary = {
  currentPlayers: number
  lifetimeAvgDAU: number
  recentAvgDAU: number
  avgPeakConcurrent: number
  maxPeakConcurrent: number
  avgDAU: number
  maxDAU: number
  avgSteamDeck: number
  maxSteamDeck: number
}
type PlayersData = {
  summary: PlayerSummary
  peakConcurrent: PlayerHistoryPoint[]
  dailyActive: PlayerHistoryPoint[]
}

function loadPlayersStore(): Record<string, { lastUpdated: number; data: PlayersData }> {
  try {
    if (fs.existsSync(PLAYERS_FILE)) return JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf-8'))
  } catch { /* ignore */ }
  return {}
}

function savePlayersStore(store: Record<string, { lastUpdated: number; data: PlayersData }>) {
  try { fs.writeFileSync(PLAYERS_FILE, JSON.stringify(store, null, 2)) } catch { /* ignore */ }
}

function fetchPlayers(appId: string) {
  if (!backgroundView) { createBackgroundView(); if (!backgroundView) return }
  const now = Date.now()
  const store = loadPlayersStore()
  const cached = store[appId]
  if (cached && cached.data && (now - cached.lastUpdated < FETCH_COOLDOWN)) {
    console.log(`[players] Serving cached data for ${appId}`)
    win?.webContents.send('steam-players-update', { appId, players: cached.data })
    return
  }

  if (win) {
    win.addBrowserView(backgroundView)
    backgroundView.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  }
  const url = `https://partner.steampowered.com/app/players/${appId}/`
  console.log(`[players] Fetching ${url}`)
  backgroundView.webContents.removeAllListeners('did-finish-load')
  backgroundView.webContents.loadURL(url)
  backgroundView.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      try {
        if (!backgroundView || backgroundView.webContents.isDestroyed()) return

        // Step 1: Find and navigate to "All History" link to ensure full dataset
        const allHistoryHref: string | null = await backgroundView.webContents.executeJavaScript(`
          (function() {
            const links = Array.from(document.querySelectorAll('a'))
            const el = links.find(a => /all.{0,5}history/i.test((a.textContent || '').trim()))
            return el ? el.href : null
          })()
        `)
        if (allHistoryHref) {
          console.log(`[players] Navigating to All History: ${allHistoryHref}`)
          backgroundView.webContents.removeAllListeners('did-finish-load')
          backgroundView.webContents.loadURL(allHistoryHref)
          await new Promise<void>(resolve => backgroundView!.webContents.once('did-finish-load', resolve))
          await new Promise(r => setTimeout(r, 1500))
        } else {
          console.log('[players] All History link not found, scraping default page')
        }

        if (!backgroundView || backgroundView.webContents.isDestroyed()) return
        const result = await backgroundView.webContents.executeJavaScript(`
          (function() {
            const getText = (el) => (el ? (el.innerText || el.textContent || '').trim() : '')
            const parseNum = (s) => parseInt((s || '').replace(/[^0-9]/g, '')) || 0

            // Summary stats from tables
            let currentPlayers = 0, lifetimeAvgDAU = 0, recentAvgDAU = 0
            let avgPeakConcurrent = 0, maxPeakConcurrent = 0, avgDAU = 0, maxDAU = 0
            let avgSteamDeck = 0, maxSteamDeck = 0

            for (const row of document.querySelectorAll('table tr')) {
              const tds = row.querySelectorAll('td')
              if (tds.length < 2) continue
              const label = getText(tds[0]).toLowerCase()
              // Find rightmost non-empty td (All History column)
              let valTd = null
              for (let i = tds.length - 1; i >= 1; i--) {
                const t = getText(tds[i])
                if (t && /\\d/.test(t)) { valTd = tds[i]; break }
              }
              if (!valTd) continue
              const val = parseNum(getText(valTd))
              if (label.includes('current players')) currentPlayers = val
              else if (label.includes('lifetime avg daily active')) lifetimeAvgDAU = val
              else if (label.includes('recent avg daily active')) recentAvgDAU = val
              else if (label.includes('average daily peak concurrent')) avgPeakConcurrent = val
              else if (label.includes('maximum daily peak concurrent')) maxPeakConcurrent = val
              else if (label.includes('average daily active users')) avgDAU = val
              else if (label.includes('maximum daily active users')) maxDAU = val
              else if (label.includes('average daily steam deck')) avgSteamDeck = val
              else if (label.includes('maximum daily steam deck')) maxSteamDeck = val
            }

            // Extract time series from inline <script> tags
            let peakConcurrent = []
            let dailyActive = []
            for (const script of document.querySelectorAll('script')) {
              const text = script.textContent || ''
              if (!text.includes("'user_graph'")) continue
              // Find start of data array after 'user_graph' ,
              const marker = text.indexOf("'user_graph'")
              if (marker < 0) continue
              const dataStart = text.indexOf('[', marker + 12)
              if (dataStart < 0) continue
              // Match balanced brackets to get full data array
              let depth = 0, endIdx = dataStart
              for (let i = dataStart; i < text.length; i++) {
                if (text[i] === '[') depth++
                else if (text[i] === ']') { depth--; if (depth === 0) { endIdx = i; break } }
              }
              try {
                const parsed = JSON.parse(text.slice(dataStart, endIdx + 1))
                if (Array.isArray(parsed) && parsed.length >= 2) {
                  peakConcurrent = parsed[0].map(p => ({ date: p[0], value: p[1] }))
                  dailyActive = parsed[1].map(p => ({ date: p[0], value: p[1] }))
                }
              } catch (e) { /* parse failed */ }
              break
            }

            return { currentPlayers, lifetimeAvgDAU, recentAvgDAU, avgPeakConcurrent, maxPeakConcurrent, avgDAU, maxDAU, avgSteamDeck, maxSteamDeck, peakConcurrent, dailyActive }
          })()
        `)
        if (!result) {
          console.error('[players] Failed to parse players page for', appId)
          return
        }
        const data: PlayersData = {
          summary: {
            currentPlayers: result.currentPlayers,
            lifetimeAvgDAU: result.lifetimeAvgDAU,
            recentAvgDAU: result.recentAvgDAU,
            avgPeakConcurrent: result.avgPeakConcurrent,
            maxPeakConcurrent: result.maxPeakConcurrent,
            avgDAU: result.avgDAU,
            maxDAU: result.maxDAU,
            avgSteamDeck: result.avgSteamDeck,
            maxSteamDeck: result.maxSteamDeck,
          },
          peakConcurrent: result.peakConcurrent || [],
          dailyActive: result.dailyActive || [],
        }
        store[appId] = { lastUpdated: Date.now(), data }
        savePlayersStore(store)
        console.log(`[players] Saved for ${appId}: peak=${data.summary.maxPeakConcurrent} maxDAU=${data.summary.maxDAU} series=${data.peakConcurrent.length}pts`)
        win?.webContents.send('steam-players-update', { appId, players: data })
      } catch (e) {
        console.error('[players] Error:', e)
      }
    }, 2000)
  })
}

type PortfolioGame = { name: string; appId: string; rank: string; units: string }
type PortfolioCacheEntry = { lastUpdated: number; games: PortfolioGame[]; title?: string; totalUnits?: string }

function loadPortfolioCache(filePath: string): PortfolioCacheEntry | null {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch { /* ignore */ }
  return null
}

function savePortfolioCache(filePath: string, data: { games: PortfolioGame[]; title?: string; totalUnits?: string }) {
  try {
    fs.writeFileSync(filePath, JSON.stringify({ lastUpdated: Date.now(), ...data }, null, 2))
  } catch { /* ignore */ }
}

// Helper to manage history store
function loadHistoryStore(): Record<string, { lastUpdated: number, data: { date: string, value: number }[] }> {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('Failed to load history store:', e);
    }
    return {};
}

function saveHistoryStore(store: Record<string, { lastUpdated: number, data: { date: string, value: number }[] }>) {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(store, null, 2));
    } catch (e) {
        console.error('Failed to save history store:', e);
    }
}

type WishlistPoint = {
    date: string
    additions: number
    deletions: number
    purchases: number
    gifts: number
    balance: number
    net: number
}

type WishlistStoreEntry = {
    lastUpdated: number
    data: WishlistPoint[]
    currentOutstanding: number | null
}

function loadWishlistStore(): Record<string, WishlistStoreEntry> {
    try {
        if (fs.existsSync(WISHLIST_FILE)) {
            const raw = fs.readFileSync(WISHLIST_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('Failed to load wishlist store:', e);
    }
    return {};
}

function saveWishlistStore(store: Record<string, WishlistStoreEntry>) {
    try {
        fs.writeFileSync(WISHLIST_FILE, JSON.stringify(store, null, 2));
    } catch (e) {
        console.error('Failed to save wishlist store:', e);
    }
}

function fetchHistory(appId: string) {
    if (!backgroundView) {
        createBackgroundView();
        if (!backgroundView) return; 
    }
    
    // Check cooldown
    const now = Date.now();
    const store = loadHistoryStore();
    const appHistory = store[appId];

    // If we have data and it's fresh enough, send it immediately
    if (appHistory && appHistory.data.length > 0) {
        console.log(`Sending cached history for ${appId} (${appHistory.data.length} records)`);
        win?.webContents.send('steam-history-update', { appId, history: appHistory.data });
        
        // Check if we need to update
        if (appHistory.lastUpdated && (now - appHistory.lastUpdated < FETCH_COOLDOWN)) {
             console.log(`Skipping history fetch for ${appId} (cached & fresh) — triggering downstream fetches`);
             // Still must trigger wishlist/playtime/players even when history is cached
             fetchWishlist(appId);
             return;
        }
    }
    
    console.log(`Starting history fetch for ${appId}...`);
    // Tell renderer that a fresh fetch is starting (so it can show loading state)
    win?.webContents.send('steam-history-fetching', appId)

    const dateStart = '2000-01-01'
    const dateEnd = new Date().toISOString().split('T')[0]
    // Load the app details page WITH date params so Steam sets the right cookies
    // and the "view as csv" form has correct hidden field values.
    // The POST to report_csv.php must come from this page (Referer check).
    const appDetailsUrl = `https://partner.steampowered.com/app/details/${appId}/?dateStart=${dateStart}&dateEnd=${dateEnd}`

    if (!win) return
    backgroundView.webContents.removeAllListeners('did-finish-load')
    win.addBrowserView(backgroundView)
    backgroundView.setBounds({ x: 0, y: 0, width: 1, height: 1 })

    console.log(`[history] Loading app details page: ${appDetailsUrl}`)
    backgroundView.webContents.loadURL(appDetailsUrl)
    backgroundView.webContents.once('did-finish-load', async () => {
        // Wait longer: Steam's app details page runs JS to render the form/table
        await new Promise(r => setTimeout(r, 2500))
        if (!backgroundView || backgroundView.webContents.isDestroyed()) return
        try {
            const result = await backgroundView.webContents.executeJavaScript(`
                (async function() {
                    function isValidCsv(text) {
                        if (!text || text.length < 50) return false;
                        if (/<!DOCTYPE|<html/i.test(text)) return false;
                        return /\\d{4}-\\d{2}-\\d{2}/.test(text) || text.split('\\n').length > 3;
                    }

                    // Find the form that posts to report_csv.php (the "view as csv" button)
                    var allForms = Array.from(document.querySelectorAll('form'));
                    var csvForm = allForms.find(function(f) {
                        return (f.action || '').includes('report_csv');
                    });
                    // Also try: find by submit button text
                    if (!csvForm) {
                        var btns = Array.from(document.querySelectorAll('input[type="submit"], button'));
                        for (var btn of btns) {
                            var label = (btn.value || btn.textContent || '').toLowerCase();
                            if (label.includes('csv') || label.includes('download')) {
                                csvForm = btn.closest('form');
                                if (csvForm) break;
                            }
                        }
                    }

                    if (!csvForm) {
                        // Log what forms exist for debugging
                        var formInfo = allForms.map(function(f) {
                            return { action: f.action, inputs: f.querySelectorAll('input[name]').length };
                        });
                        return { error: 'form_not_found', formsCount: allForms.length, formInfo: formInfo };
                    }

                    // Serialize all form fields
                    var inputs = csvForm.querySelectorAll('input[name], select[name], textarea[name]');
                    var bodyParts = [];
                    for (var i = 0; i < inputs.length; i++) {
                        var el = inputs[i];
                        if (!el.name) continue;
                        if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) continue;
                        bodyParts.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(el.value || ''));
                    }
                    var body = bodyParts.join('&');

                    var res = await fetch(csvForm.action || 'https://partner.steampowered.com/report_csv.php', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: body
                    });
                    var text = await res.text();
                    if (res.ok && isValidCsv(text)) return { csv: text };
                    return { error: 'post_failed', status: res.status, preview: text.slice(0, 300), bodyLen: body.length, body: body.slice(0, 200) };
                })()
            `)
            const csvText = result && typeof result.csv === 'string' ? result.csv : null
            if (csvText && csvText.length > 100) {
                console.log(`[history] CSV fetched for ${appId}, ${csvText.length} chars.`)
                processHistoryCSVContent(appId, csvText)
            } else if (result?.error === 'form_not_found') {
                console.error(`[history] Form not found on page for ${appId} (demo/playtest/no sales). forms=${result.formsCount}`, result.formInfo)
                win?.webContents.send('steam-history-no-data', { appId })
            } else {
                console.error(`[history] POST failed for ${appId}. status=${result?.status}`)
                if (result?.body) console.error(`[history] sent body: ${result.body}`)
                if (result?.preview) console.error(`[history] response preview: ${JSON.stringify((result.preview as string).slice(0, 200))}`)
            }
        } catch (e) {
            console.error('[history] CSV fetch error:', e)
        }
        // Now trigger wishlist fetch after history is done to avoid backgroundView race
        fetchWishlist(appId)
    })
}

function processHistoryCSVContent(appId: string, fileContent: string) {
    try {
        const lines = fileContent.split('\n');
        let headerIndex = 0;
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            if (lines[i].toLowerCase().includes('date') && lines[i].toLowerCase().includes('units')) {
                headerIndex = i;
                break;
            }
        }
        const cleanContent = lines.slice(headerIndex).join('\n');
        const records = parse<Record<string, string>>(cleanContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
        const newHistory: { date: string; value: number }[] = [];
        if (records.length > 0) {
            const keys = Object.keys(records[0]);
            const dateKey = keys.find(k => k.toLowerCase().includes('date'));
            const unitsKey = keys.find(k => k.toLowerCase().includes('total units') || k.toLowerCase().includes('units'));
            if (dateKey && unitsKey) {
                for (const row of records) {
                    const dateStr = row[dateKey];
                    const unitsStr = row[unitsKey];
                    if (dateStr && unitsStr) {
                        const val = parseInt(unitsStr.replace(/,/g, '')) || 0;
                        let formattedDate = dateStr;
                        const parsedDate = new Date(dateStr);
                        if (!isNaN(parsedDate.getTime())) {
                            formattedDate = parsedDate.toISOString().split('T')[0];
                        }
                        newHistory.push({ date: formattedDate, value: val });
                    }
                }
            }
        }
        newHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const store = loadHistoryStore();
        store[appId] = { lastUpdated: Date.now(), data: newHistory };
        saveHistoryStore(store);
        console.log(`Processed ${newHistory.length} history records for ${appId} (from fetch).`);
        win?.webContents.send('steam-history-update', { appId, history: newHistory });
    } catch (e) {
        console.error('Error processing history CSV content:', e);
    }
}

function fetchWishlist(appId: string) {
    if (!backgroundView) {
        createBackgroundView();
        if (!backgroundView) return;
    }

    const now = Date.now();
    const store = loadWishlistStore();
    const appWishlist = store[appId];

    if (appWishlist && appWishlist.data.length > 0) {
        win?.webContents.send('steam-wishlist-update', { appId, wishlist: appWishlist.data, currentOutstanding: appWishlist.currentOutstanding ?? null });
        // If cache is fresh, skip re-download but still trigger downstream
        if (appWishlist.lastUpdated && (now - appWishlist.lastUpdated < FETCH_COOLDOWN)) {
            console.log(`Skipping wishlist fetch for ${appId} (cached & fresh) — triggering playtime/players`);
            fetchPlaytime(appId);
            return;
        }
    }

    console.log(`Starting wishlist fetch for ${appId}...`);

    if (win) {
        win.addBrowserView(backgroundView);
        backgroundView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    }

    const requestToken = ++activeWishlistDownloadToken

    const wishlistPageUrl = `https://partner.steampowered.com/app/wishlist/${appId}/`;
    backgroundView.webContents.loadURL(wishlistPageUrl);

    backgroundView.webContents.once('did-finish-load', async () => {
        setTimeout(async () => {
            try {
                if (!backgroundView || backgroundView.webContents.isDestroyed()) {
                    return
                }
                if (requestToken !== activeWishlistDownloadToken) return

                const meta = await backgroundView.webContents.executeJavaScript(`
                    (function() {
                        const normalize = (v) => {
                            const raw = (v || '').trim()
                            if (!raw) return null
                            if (/^\\d{4}-\\d{2}-\\d{2}$/.test(raw)) return raw
                            const parsed = new Date(raw)
                            if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]
                            return null
                        }
                        const parseNum = (v) => {
                            const text = (v || '').trim()
                            if (!text) return null
                            const cleaned = text.replace(/[(),]/g, '')
                            const n = parseInt(cleaned, 10)
                            if (Number.isNaN(n)) return null
                            return text.startsWith('(') && text.endsWith(')') ? -n : n
                        }
                        let firstDate = null
                        let currentOutstanding = null
                        const rows = Array.from(document.querySelectorAll('tr'))
                        for (const row of rows) {
                            const cells = row.querySelectorAll('td')
                            if (cells.length < 2) continue
                            const label = (cells[0].innerText || '').trim().toLowerCase()
                            if (label.includes('date first wishlisted')) {
                                firstDate = normalize(cells[1].innerText)
                            }
                            if (label.includes('current outstanding wishes')) {
                                currentOutstanding = parseNum(cells[1].innerText)
                            }
                        }
                        if (currentOutstanding === null) {
                            const text = document.body?.innerText || ''
                            const match = text.match(/current outstanding wishes[^0-9]*([0-9][0-9,]*)/i)
                            if (match && match[1]) {
                                currentOutstanding = parseInt(match[1].replace(/,/g, ''), 10)
                            }
                        }
                        return { firstDate, currentOutstanding }
                    })()
                `)
                console.log(`[wishlist] Meta for ${appId}:`, meta)

                // If game was never wishlisted (no firstDate and no outstanding), skip CSV download
                if (!meta?.firstDate && (meta?.currentOutstanding === 0 || meta?.currentOutstanding === null)) {
                    console.log(`[wishlist] No wishlist data for ${appId}, skipping CSV download`)
                    win?.webContents.send('steam-wishlist-update', { appId, wishlist: [], currentOutstanding: 0, noData: true })
                    fetchPlaytime(appId)
                    return
                }

                const dateStart = meta?.firstDate || '2000-01-01'
                const dateEnd = new Date().toISOString().split('T')[0]
                const csvUrl = `https://partner.steampowered.com/report_csv.php?file=SteamWishlists_${appId}_${dateStart}_to_${dateEnd}&params=query=QueryWishlistActionsForCSV^appID=${appId}^dateStart=${dateStart}^dateEnd=${dateEnd}^interpreter=WishlistReportInterpreter`
                console.log(`[wishlist] CSV URL for ${appId}: ${csvUrl}`)

                const csvText = await backgroundView.webContents.executeJavaScript(`
                    (async function() {
                        const response = await fetch(${JSON.stringify(csvUrl)}, { credentials: 'include' })
                        if (!response.ok) return ''
                        return await response.text()
                    })()
                `)
                if (requestToken !== activeWishlistDownloadToken) return
                processWishlistCSVContent(appId, csvText || '', meta?.currentOutstanding ?? null)
                // Chain playtime fetch after wishlist completes (serial, avoids backgroundView race)
                fetchPlaytime(appId)
            } catch (e) {
                console.error('Failed to trigger wishlist csv download:', e);
                fetchPlaytime(appId)
            }
        }, 2000);
    });
}

function processWishlistCSVContent(appId: string, fileContent: string, currentOutstanding: number | null) {
    try {
        const existing = loadWishlistStore()[appId]
        const effectiveOutstandingFromCache = existing?.currentOutstanding ?? null
        const resolvedOutstanding = currentOutstanding ?? effectiveOutstandingFromCache
        if (!fileContent || fileContent.includes('Steamworks Product Data login')) {
            win?.webContents.send('steam-wishlist-update', { appId, wishlist: [], currentOutstanding: resolvedOutstanding })
            return
        }
        const lines = fileContent.split(/\r?\n/).map(l => l.trimEnd());
        let delimiter = ','
        if (lines[0] && lines[0].toLowerCase().startsWith('sep=')) {
            delimiter = lines[0].slice(4).trim() || ','
        }

        let headerIndex = -1;
        for (let i = 0; i < Math.min(60, lines.length); i++) {
            const line = lines[i].toLowerCase()
            const hasDate = line.includes('date') || line.includes('datelocal')
            const hasAdds = line.includes('add') || line.includes('adds')
            const hasDeletes = line.includes('delet') || line.includes('deletes')
            if (hasDate && (hasAdds || hasDeletes || line.includes('wishlist') || line.includes('outstanding') || line.includes('balance'))) {
                headerIndex = i;
                break;
            }
        }
        if (headerIndex === -1) {
            console.error(`[wishlist] Header not found for ${appId}. Preview:`, lines.slice(0, 8).join(' | '))
            win?.webContents.send('steam-wishlist-update', { appId, wishlist: [], currentOutstanding: resolvedOutstanding })
            return
        }

        const cleanContent = lines.slice(headerIndex).join('\n');
        const records = parse<Record<string, string>>(cleanContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            delimiter,
            relax_column_count: true,
            skip_records_with_error: true
        });

        const parseMetric = (raw: string | undefined) => {
            if (!raw) return 0
            const text = raw.trim()
            if (!text) return 0
            const negative = text.startsWith('(') && text.endsWith(')')
            const cleaned = text.replace(/[(),]/g, '')
            const value = parseInt(cleaned, 10) || 0
            return negative ? -value : value
        }

        const result: WishlistPoint[] = []
        if (records.length > 0) {
            const keys = Object.keys(records[0])
            const dateKey = keys.find(k => k.toLowerCase().includes('date'))
            const additionsKey = keys.find(k => k.toLowerCase().includes('add'))
            const deletionsKey = keys.find(k => k.toLowerCase().includes('delet'))
            const purchasesKey = keys.find(k => k.toLowerCase().includes('purchase'))
            const giftsKey = keys.find(k => k.toLowerCase().includes('gift'))
            const balanceKey = keys.find(k => k.toLowerCase().includes('outstanding') || k.toLowerCase().includes('balance'))
            const netKey = keys.find(k => k.toLowerCase().includes('net'))

            if (dateKey) {
                for (const row of records) {
                    const dateRaw = row[dateKey]
                    const parsedDate = new Date(dateRaw)
                    if (isNaN(parsedDate.getTime())) continue
                    const date = parsedDate.toISOString().split('T')[0]
                    const additions = Math.abs(parseMetric(additionsKey ? row[additionsKey] : undefined))
                    const deletions = -Math.abs(parseMetric(deletionsKey ? row[deletionsKey] : undefined))
                    const purchases = -Math.abs(parseMetric(purchasesKey ? row[purchasesKey] : undefined))
                    const gifts = -Math.abs(parseMetric(giftsKey ? row[giftsKey] : undefined))
                    const balance = parseMetric(balanceKey ? row[balanceKey] : undefined)
                    const net = netKey ? parseMetric(row[netKey]) : additions + deletions + purchases + gifts
                    result.push({ date, additions, deletions, purchases, gifts, balance, net })
                }
            }
        }

        result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        if (result.length > 0) {
            let cumulative = 0
            for (const point of result) {
                cumulative += point.net
                point.balance = cumulative
            }
            const lastFromCsv = result[result.length - 1].balance
            const anchorOutstanding = resolvedOutstanding ?? (lastFromCsv > 0 ? lastFromCsv : null)
            if (anchorOutstanding !== null) {
                const offset = anchorOutstanding - result[result.length - 1].balance
                for (const point of result) {
                    point.balance += offset
                }
            }
        }
        const store = loadWishlistStore()
        const finalOutstanding = resolvedOutstanding ?? (result.length > 0 ? result[result.length - 1].balance : null)
        store[appId] = { lastUpdated: Date.now(), data: result, currentOutstanding: finalOutstanding }
        saveWishlistStore(store)
        win?.webContents.send('steam-wishlist-update', { appId, wishlist: result, currentOutstanding: finalOutstanding })
    } catch (e) {
        console.error('Error processing wishlist CSV:', e);
    }
}


const PORTFOLIO_SCRAPE_SCRIPT = `
  (function() {
    try {
      const data = { type: 'portfolio', games: [], _debug: {} };
      const cleanText = (text) => text ? text.replace(/\\s+/g, ' ').trim() : '';
      const rows = Array.from(document.querySelectorAll('tr'));
      const findStat = (labelPattern) => {
        for (const row of rows) {
          if (row.innerText.match(labelPattern)) {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) return cells[cells.length - 1].innerText.trim();
          }
        }
        return null;
      };
      data.lifetimeRevenue = findStat(/Lifetime revenue/i);
      data.steamUnits = findStat(/Steam units/i);
      data.retailActivations = findStat(/retail activations/i);
      data.totalUnits = findStat(/lifetime units total/i) || findStat(/Total units/i);
      const companyHeader = document.querySelector('h2');
      if (companyHeader && companyHeader.innerText.includes('Steam Stats')) {
        data.title = companyHeader.innerText.replace('Steam Stats - ', '').trim();
      }
      let unitsColIndex = -1, rankColIndex = -1;
      const headerRow = Array.from(document.querySelectorAll('tr')).find(r =>
        r.innerText.toLowerCase().includes('rank') && (r.innerText.toLowerCase().includes('units') || r.innerText.toLowerCase().includes('product'))
      ) || rows[0];
      // Collect ALL header cell texts for debugging
      const allHeaderTexts = [];
      if (headerRow) {
        const cells = headerRow.querySelectorAll('th, td');
        for (let i = 0; i < cells.length; i++) {
          const text = cells[i].innerText.toLowerCase().trim();
          allHeaderTexts.push(text);
          if (text.includes('rank')) rankColIndex = i;
          // Broaden match: any column that contains 'units' (not just with 'current'/'today')
          if (text.includes('units')) {
            // Prefer columns specifically mentioning today/current; otherwise take any units col as fallback
            if (unitsColIndex === -1 || text.includes('current') || text.includes('today')) unitsColIndex = i;
          }
        }
      }
      data._debug = { allHeaderTexts, unitsColIndex, rankColIndex, pageUrl: location.href };
      for (const row of rows) {
        const link = row.querySelector('a[href*="/app/details/"]');
        const cells = row.querySelectorAll('td');
        if (link && cells.length >= 3) {
          const name = cleanText(link.innerText);
          const href = link.getAttribute('href');
          const appIdMatch = href.match(/app\\/details\\/(\\d+)/);
          const appId = appIdMatch ? appIdMatch[1] : null;
          if (appId) {
            let rank = '0', units = '0';
            if (unitsColIndex > -1 && cells[unitsColIndex]) units = cleanText(cells[unitsColIndex].innerText);
            if (rankColIndex > -1 && cells[rankColIndex]) rank = cleanText(cells[rankColIndex].innerText);
            if (units === '0' && rank === '0') {
              const linkParentCell = link.closest('td');
              if (linkParentCell) {
                const cellIndex = Array.from(row.children).indexOf(linkParentCell);
                if (cellIndex > -1) {
                  if (cells[cellIndex + 1]) rank = cleanText(cells[cellIndex + 1].innerText);
                  if (cells[cellIndex + 2]) units = cleanText(cells[cellIndex + 2].innerText);
                }
              }
            }
            data.games.push({ name, appId, rank, units });
          }
        }
      }
      return data;
    } catch (e) {
      return { error: e.message };
    }
  })()
`

async function scrapePortfolioFromWebContents(webContents: WebContents): Promise<{ type: string; games: Array<{ name: string; appId: string; rank: string; units: string }>; title?: string; totalUnits?: string } | null> {
  try {
    const result = await webContents.executeJavaScript(PORTFOLIO_SCRAPE_SCRIPT)
    if (result && result._debug) {
      console.log('[portfolio-scrape] pageUrl:', result._debug.pageUrl)
      console.log('[portfolio-scrape] header cols:', JSON.stringify(result._debug.allHeaderTexts))
      console.log('[portfolio-scrape] unitsColIndex:', result._debug.unitsColIndex, '| rankColIndex:', result._debug.rankColIndex)
      if (result.games?.length > 0) {
        const preview = result.games.slice(0, 3).map((g: {name:string;units:string}) => `${g.name}: ${g.units}`).join(', ')
        console.log('[portfolio-scrape] first 3 games:', preview)
      }
    }
    return result && !result.error ? result : null
  } catch (e) {
    console.error('Portfolio scrape from webContents failed:', e)
    return null
  }
}

// Fetch Today portfolio data via backgroundView (always loads clean URL so we get Today view, not whatever steamView shows)
async function fetchPortfolioToday() {
  if (!backgroundView) { createBackgroundView(); if (!backgroundView) return }
  if (!win) return

  const today = new Date().toISOString().split('T')[0]
  // Explicitly pass today's date so Steam is forced to show single-day (Today) data,
  // regardless of what the user's session last viewed (All History, 7 days, etc.)
  const todayUrl = `${STEAM_ALL_APPS_URL}?dateStart=${today}&dateEnd=${today}`

  // Validate cached data: only use if its lastUpdated date matches today
  const cache = loadPortfolioCache(PORTFOLIO_TODAY_FILE)
  const cacheDate = cache?.lastUpdated ? new Date(cache.lastUpdated).toISOString().split('T')[0] : null
  const cacheIsToday = cacheDate === today
  if (cache && cache.games?.length > 0 && cacheIsToday) {
    console.log(`[portfolio-today] Sending cached today data (${cache.games.length} games)`)
    win.webContents.send('steam-data-update', { type: 'portfolio', games: cache.games, title: cache.title, totalUnits: cache.totalUnits })
    if (cache.lastUpdated && Date.now() - cache.lastUpdated < FETCH_COOLDOWN) {
      console.log('[portfolio-today] Cache is fresh, skipping fetch')
      return
    }
  }

  console.log(`[portfolio-today] Fetching fresh Today data (${today}) from background...`)
  console.log(`[portfolio-today] Loading URL: ${todayUrl}`)
  backgroundView.webContents.removeAllListeners('did-finish-load')
  win.addBrowserView(backgroundView)
  backgroundView.setBounds({ x: 0, y: 0, width: 1, height: 1 })
  // Open DevTools only in dev mode
  if (process.env.VITE_DEV_SERVER_URL) {
    backgroundView.webContents.openDevTools({ mode: 'detach' })
  }
  // Load with explicit today date → forces Today single-day view
  backgroundView.webContents.loadURL(todayUrl)
  backgroundView.webContents.once('did-finish-load', async () => {
    await new Promise(r => setTimeout(r, 1500))
    if (!backgroundView || backgroundView.webContents.isDestroyed()) return
    const result = await scrapePortfolioFromWebContents(backgroundView.webContents)
    if (win && !win.webContents.isDestroyed() && result && result.games?.length > 0) {
      savePortfolioCache(PORTFOLIO_TODAY_FILE, { games: result.games, title: result.title, totalUnits: result.totalUnits })
      win.webContents.send('steam-data-update', { type: 'portfolio', games: result.games, title: result.title, totalUnits: result.totalUnits })
      console.log(`[portfolio-today] Fetched ${result.games.length} games`)
    }
    backgroundView?.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  })
}

// Fetch All History portfolio data via backgroundView with date params
async function fetchPortfolioAllHistory() {
  if (!backgroundView) { createBackgroundView(); if (!backgroundView) return }
  if (!win) return

  // Send cached data immediately if available
  const cache = loadPortfolioCache(PORTFOLIO_ALLHISTORY_FILE)
  if (cache && cache.games?.length > 0) {
    console.log(`[portfolio-allhistory] Sending cached data (${cache.games.length} games)`)
    win.webContents.send('steam-portfolio-all-history', { games: cache.games, title: cache.title, totalUnits: cache.totalUnits })
    if (cache.lastUpdated && Date.now() - cache.lastUpdated < FETCH_COOLDOWN) {
      console.log('[portfolio-allhistory] Cache is fresh, skipping fetch')
      return
    }
  }

  console.log('[portfolio-allhistory] Fetching fresh All History data from background...')
  backgroundView.webContents.removeAllListeners('did-finish-load')
  win.addBrowserView(backgroundView)
  backgroundView.setBounds({ x: 0, y: 0, width: 1, height: 1 })
  const dateEnd = new Date().toISOString().split('T')[0]
  // Load URL WITH date params → Steam shows All History view
  backgroundView.webContents.loadURL(`${STEAM_ALL_APPS_URL}?dateStart=2000-01-01&dateEnd=${dateEnd}`)
  backgroundView.webContents.once('did-finish-load', async () => {
    await new Promise(r => setTimeout(r, 1500))
    if (!backgroundView || backgroundView.webContents.isDestroyed()) return
    const result = await scrapePortfolioFromWebContents(backgroundView.webContents)
    if (win && !win.webContents.isDestroyed() && result && result.games?.length > 0) {
      savePortfolioCache(PORTFOLIO_ALLHISTORY_FILE, { games: result.games, title: result.title, totalUnits: result.totalUnits })
      win.webContents.send('steam-portfolio-all-history', { games: result.games, title: result.title, totalUnits: result.totalUnits })
      console.log(`[portfolio-allhistory] Fetched ${result.games.length} games`)
    }
    backgroundView?.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  })
}

async function scrapeData() {
  if (!steamView) return

  // Extract App ID from current URL
  const currentUrl = steamView.webContents.getURL();
  const appIdMatch = currentUrl.match(/app\/details\/(\d+)/);
  const appId = appIdMatch ? appIdMatch[1] : null;

  // Script to extract data based on the screenshot
  const code = `
    (function() {
      try {
        const data = {};
        
        // Helper to clean and parse text
        const cleanText = (text) => text ? text.replace(/\\s+/g, ' ').trim() : '';
        
        // Get all rows
        const rows = Array.from(document.querySelectorAll('tr'));
        
        function findRowValue(label, parentElement = document) {
            // Search within a specific parent if provided, otherwise document
            const searchRows = parentElement === document ? rows : Array.from(parentElement.querySelectorAll('tr'));
            
            for (const row of searchRows) {
                if (row.innerText.includes(label)) {
                    const cells = row.querySelectorAll('td');
                    // Usually the value is the last cell or the one to the right
                    // For the top table, it's often the 2nd column (index 1) if label is index 0
                    // But 'Wishlists' has '48,197 + (view...)'
                    
                    // Let's try to find the cell that contains a number or $
                    for (let i = 0; i < cells.length; i++) {
                        const text = cells[i].innerText;
                        // Skip if it's the label itself
                        if (text.includes(label)) continue;
                        
                        // If it has digits, it's likely the value
                        if (/[0-9]/.test(text)) {
                            return cleanText(text);
                        }
                    }
                    
                    // Fallback: return the last cell
                    if (cells.length > 0) return cleanText(cells[cells.length - 1].innerText);
                }
            }
            return null;
        }

        // --- Lifetime Data (Top Table) ---
        // Usually the first table or main section
        data.lifetimeRevenueGross = findRowValue('Lifetime Steam revenue (gross)');
        data.lifetimeRevenueNet = findRowValue('Lifetime Steam revenue (net)');
        data.lifetimeUnits = findRowValue('Lifetime Steam units');
        data.wishlists = findRowValue('Wishlists');
        data.dailyActiveUsers = findRowValue('Daily active users');
        data.currentPlayers = findRowValue('Current players');

        // --- Today's Data (Bottom Table) ---
        // Look for the "Today" section. 
        // Strategy: Find the text "View most recent: today" and look at the table immediately following it.
        
        let todaySection = null;
        const allDivs = Array.from(document.querySelectorAll('div, span, td')); // Broad search for the anchor text
        for (const el of allDivs) {
            if (el.innerText && el.innerText.includes('View most recent:') && el.innerText.includes('today')) {
                // The table should be following this element
                // Go up to a container and find the next table? 
                // Or maybe it's just the next sibling?
                let next = el.nextElementSibling;
                while (next) {
                    if (next.tagName === 'TABLE') {
                        todaySection = next;
                        break;
                    }
                    next = next.nextElementSibling;
                }
                
                // If not found as sibling, maybe el is inside a wrapper, so check parent's siblings
                if (!todaySection && el.parentElement) {
                     let parentNext = el.parentElement.nextElementSibling;
                     while (parentNext) {
                        if (parentNext.tagName === 'TABLE') {
                            todaySection = parentNext;
                            break;
                        }
                        parentNext = parentNext.nextElementSibling;
                     }
                }
                if (todaySection) break;
            }
        }
        
        if (todaySection) {
            data.todayRevenue = findRowValue('Steam revenue', todaySection);
            data.todayUnits = findRowValue('Steam units', todaySection);
        } else {
            // Fallback: Try to find rows that strictly start with "Steam revenue" but appearing later in the DOM?
            // Or look for a table with "Today" in the header?
            const tables = document.querySelectorAll('table');
            for (const table of tables) {
                if (table.innerText.includes('Today')) {
                     data.todayRevenue = findRowValue('Steam revenue', table);
                     data.todayUnits = findRowValue('Steam units', table);
                     // If we found something, break
                     if (data.todayRevenue) break;
                }
            }
        }

        // Game Title
        // Strategy: Look for the h2 element that starts with "Game:"
        const h2s = Array.from(document.querySelectorAll('h2, h1')); // Look for h1 too
        const titleEl = h2s.find(el => el.innerText.trim().startsWith('Game:'));
        if (titleEl) {
             // Extract just the name "Iron Core: Mech Survivor" from "Game: Iron Core: Mech Survivor (3586420)"
             let text = titleEl.innerText.trim();
             // Remove "Game: " prefix
             if (text.startsWith('Game:')) {
                 text = text.slice(5).trim();
             }
             // Remove App ID suffix "(3586420)"
             const appSuffixStart = text.lastIndexOf(' (');
             if (appSuffixStart > -1 && text.endsWith(')')) {
                 text = text.slice(0, appSuffixStart).trim();
             }
             data.title = cleanText(text);
        } else {
             // Fallback to document title or other selector
             const appNameEl = document.querySelector('.app_name'); // Sometimes used in Steamworks
             if (appNameEl) data.title = cleanText(appNameEl.innerText);
        }

        return data;
      } catch (e) {
        return { error: e.message };
      }
    })()
  `
  
  try {
    const result = await steamView.webContents.executeJavaScript(code)
    
    // Attach App ID to the result
    if (appId) {
        result.appId = appId;
    }
    
    console.log('Scraped Data:', result)
    win?.webContents.send('steam-data-update', result)
  } catch (e) {
    console.error('Scraping failed:', e)
  }
}

// IPC to navigate to a specific app
ipcMain.on('navigate-to-app', (_event, appId) => {
    if (!steamView) return
    const url = `https://partner.steampowered.com/app/details/${appId}/`
    console.log(`Navigating to app: ${appId} -> ${url}`)
    steamView.webContents.loadURL(url)
})

ipcMain.on('navigate-to-portfolio', () => {
    if (!steamView) return
    console.log(`Navigating back to portfolio: ${STEAM_ALL_APPS_URL}`)
    steamView.webContents.loadURL(STEAM_ALL_APPS_URL)
})

ipcMain.on('logout', () => {
    if (!steamView) return
    const logoutUrl = 'https://partner.steampowered.com/login/logout'
    console.log(`Logging out -> ${logoutUrl}`)
    // Explicitly hide dashboard first
    setDashboardVisibility(false)
    // Then load logout
    steamView.webContents.loadURL(logoutUrl)
})

// IPC to toggle dashboard
ipcMain.on('toggle-dashboard', (_event, show) => {
  setDashboardVisibility(show)
})

// IPC to get initial visibility state (renderer might miss the initial event)
ipcMain.on('request-visibility-state', () => {
  if (win && !win.webContents.isDestroyed()) {
    win.webContents.send('dashboard-visibility', dashboardActive)
  }
})

// IPC: renderer requests re-send of current page data (e.g. when stuck on "Waiting for Data")
ipcMain.on('request-initial-data', () => {
  if (!steamView || steamView.webContents.isDestroyed()) return
  const url = steamView.webContents.getURL()
  if (TARGET_URL_PATTERN.test(url)) {
    scrapeData()
  } else if (ALL_PRODUCTS_PATTERN.test(url)) {
    fetchPortfolioToday()
  }
})

// IPC: retry fetching history/wishlist for an app (e.g. when "Waiting for Historical Data" and user clicks Retry)
ipcMain.on('retry-history-fetch', (_event, appId?: string) => {
  let targetAppId = appId
  if (!targetAppId && steamView && !steamView.webContents.isDestroyed()) {
    const url = steamView.webContents.getURL()
    const match = url.match(/app\/details\/(\d+)/)
    if (match) targetAppId = match[1]
  }
  if (targetAppId) {
    // fetchWishlist is called inside fetchHistory after completion to avoid backgroundView race
    fetchHistory(targetAppId)
  }
})

ipcMain.on('request-portfolio-all-history', () => {
  fetchPortfolioAllHistory()
})

function setDashboardVisibility(show: boolean) {
  dashboardActive = show
  if (!win || !steamView || steamView.webContents.isDestroyed()) return
  if (show) {
    steamView.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    if (!win.webContents.isDestroyed()) {
      win.webContents.send('dashboard-visibility', true)
    }
  } else {
    const bounds = win.getContentBounds()
    steamView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height })
    if (!win.webContents.isDestroyed()) {
      win.webContents.send('dashboard-visibility', false)
    }
  }
}

let autoRefreshInterval: NodeJS.Timeout | null = null;

function startAutoRefresh() {
    if (autoRefreshInterval) return;
    console.log('Starting auto-refresh loop (every 5 minutes)');
    // Default 5 minutes, but UI can trigger manual refresh
    autoRefreshInterval = setInterval(() => {
        console.log('Auto-refreshing data...');
        // We need to reload to get fresh server data, otherwise scraping the same DOM yields same results
        if(steamView && !steamView.webContents.isDestroyed()) {
             // Force reload ignoring cache to ensure fresh data
             steamView.webContents.reloadIgnoringCache();
        } else {
             // Stop interval if view is gone
             if (autoRefreshInterval) clearInterval(autoRefreshInterval);
             autoRefreshInterval = null;
        }
    }, 5 * 60 * 1000); 
}

// IPC to trigger manual refresh
ipcMain.on('refresh-data', () => {
    console.log('Manual refresh requested');
    if(steamView) {
        // Force reload ignoring cache
        steamView.webContents.reloadIgnoringCache();
        // The reload will trigger 'did-finish-load' which triggers checkUrl -> scrapeData
    }
})

// Fullscreen toggle (Windows: F11 or toolbar button)
ipcMain.on('toggle-fullscreen', () => {
  if (win && !win.isDestroyed()) {
    win.setFullScreen(!win.isFullScreen())
  }
})

app.whenReady().then(() => {
  // On startup, delete portfolio-today cache if it's from a previous day to avoid stale data
  const today = new Date().toISOString().split('T')[0]
  const todayCache = loadPortfolioCache(PORTFOLIO_TODAY_FILE)
  if (todayCache?.lastUpdated) {
    const cachedDate = new Date(todayCache.lastUpdated).toISOString().split('T')[0]
    if (cachedDate !== today) {
      try { fs.unlinkSync(PORTFOLIO_TODAY_FILE) } catch { /* ignore */ }
      console.log(`[portfolio-today] Cleared stale cache from ${cachedDate}`)
    }
  }

  createWindow()
  // F11 fullscreen on Windows (and other platforms)
  globalShortcut.register('F11', () => {
    if (win && !win.isDestroyed()) {
      win.setFullScreen(!win.isFullScreen())
    }
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// Update Checker Logic
// Check for updates by fetching the GitHub releases page (no API, just regex on HTML)
ipcMain.handle('check-for-update', async () => {
    try {
        const RELEASES_URL = 'https://github.com/the-super-engine/steam-sales-dashboard/tags';
        const currentVersion = app.getVersion();
        
        console.log(`Checking for updates... Current version: ${currentVersion}`);
        
        // Use electron's net module to fetch the page content
        const request = net.request(RELEASES_URL);
        
        return new Promise((resolve) => {
            request.on('response', (response) => {
                let body = '';
                response.on('data', (chunk) => {
                    body += chunk.toString();
                });
                
                response.on('end', () => {
                    // Look for version tags in the HTML: /releases/tag/v1.0.1 or /tree/v1.0.1
                    // The tags page lists tags like: /the-super-engine/steam-sales-dashboard/releases/tag/v1.0.1
                    // Also tags page might have links like /the-super-engine/steam-sales-dashboard/tree/v1.0.1
                    
                    // Regex to find semantic versions in the page content
                    // Match v1.2.3 style versions
                    const versionRegex = /v(\d+\.\d+\.\d+)/g;
                    
                    let match;
                    let latestVersion = '0.0.0';
                    
                    while ((match = versionRegex.exec(body)) !== null) {
                        const foundVersion = match[1];
                        if (isVersionNewer(foundVersion, latestVersion)) {
                            latestVersion = foundVersion;
                        }
                    }
                    
                    const hasUpdate = isVersionNewer(latestVersion, currentVersion);
                    console.log(`Update check result: hasUpdate=${hasUpdate}, latest=${latestVersion}`);
                    
                    resolve({
                        hasUpdate,
                        latestVersion,
                        currentVersion,
                        releasesUrl: 'https://github.com/the-super-engine/steam-sales-dashboard/releases'
                    });
                });
            });
            
            request.on('error', (error) => {
                console.error('Update check failed:', error);
                resolve({ hasUpdate: false, error: error.message });
            });
            
            request.end();
        });
    } catch (e) {
        console.error('Update check error:', e);
        return { hasUpdate: false, error: e instanceof Error ? e.message : String(e) };
    }
});

function isVersionNewer(latest: string, current: string): boolean {
    const parse = (s: string) => s.trim().split('.').map(n => parseInt(n, 10) || 0);
    const a = parse(latest);
    const b = parse(current);
    
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const x = a[i] || 0;
        const y = b[i] || 0;
        if (x > y) return true;
        if (x < y) return false;
    }
    return false;
}
