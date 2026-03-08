import { app, BrowserWindow, BrowserView, ipcMain, session, shell, net, type DownloadItem, type WebContents, type Event as ElectronEvent } from 'electron'
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

const STEAM_URL = 'https://partner.steampowered.com/nav_games.php'
// const STEAM_URL = 'https://partner.steampowered.com/' // Start here for login
const TARGET_URL_PATTERN = /partner\.steampowered\.com\/app\/details\/(\d+)/
const ALL_PRODUCTS_PATTERN = /partner\.steampowered\.com\/(nav_games\.php|)/

let backgroundView: BrowserView | null = null
let autoOpenedOnLaunch = false

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(process.env.PUBLIC ?? '', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../dist-electron/preload.js'),
      nodeIntegration: true,
      contextIsolation: false, // For easier IPC in this prototype
    },
    backgroundColor: '#000000', // Dark background for dashboard feel
    titleBarStyle: 'hiddenInset', // Native-like dark bar on macOS
    trafficLightPosition: { x: 12, y: 12 }
  })

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

  // Load Steam
  steamView.webContents.loadURL(STEAM_URL)

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
}

let dashboardActive = false
let activeHistoryDownloadToken = 0
let activeWishlistDownloadToken = 0

function checkUrl() {
  if (!steamView || steamView.webContents.isDestroyed()) return
  const url = steamView.webContents.getURL()
  console.log('Current URL:', url)

  if (TARGET_URL_PATTERN.test(url)) {
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

    // Trigger history fetch if we have an app ID
    if (appId) {
        fetchHistory(appId);
        fetchWishlist(appId);
    }
  } else if (ALL_PRODUCTS_PATTERN.test(url)) {
     console.log('All Products URL detected! Showing Portfolio Dashboard.')
     scrapePortfolioData()
    console.log('Sending show-dashboard-button to Steam View for Portfolio')
    setTimeout(() => {
        if (!steamView || steamView.webContents.isDestroyed()) return
        steamView.webContents.send('show-dashboard-button', true)
    }, 500)
    win?.webContents.send('steam-target-detected', 'portfolio')
    if (!autoOpenedOnLaunch) {
      autoOpenedOnLaunch = true
      setDashboardVisibility(true)
    }
    
    // We can fetch history for all games too?
    // Maybe later.
  } else {
    win?.webContents.send('steam-target-detected', false)
  }
}

const FETCH_COOLDOWN = 6 * 60 * 60 * 1000; // 6 hours (approx 3-4 times a day)
const HISTORY_FILE = path.join(app.getPath('userData'), 'steam-history.json');
const WISHLIST_FILE = path.join(app.getPath('userData'), 'steam-wishlist.json');

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
             console.log(`Skipping history fetch for ${appId} (cached & fresh)`);
             return;
        }
    }
    
    console.log(`Starting history fetch for ${appId}...`);
    
    // Calculate dates: All History (from 2000)
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const today = new Date();
    // Using full history URL as requested by user strategy
    const url = `https://partner.steampowered.com/app/details/${appId}/?dateStart=2000-01-01&dateEnd=${formatDate(today)}`;
    console.log(`Loading history URL: ${url}`);
    
    // Attach temporarily (invisible) to ensure JS runs
    if (win) {
        win.addBrowserView(backgroundView);
        backgroundView.setBounds({ x: 0, y: 0, width: 0, height: 0 }); // Hidden
    }
    
    const downloadToken = ++activeHistoryDownloadToken
    const backgroundWebContentsId = backgroundView.webContents.id
    const onWillDownload = (_event: ElectronEvent, item: DownloadItem, webContents: WebContents) => {
        if (downloadToken !== activeHistoryDownloadToken) return
        if (!backgroundView || backgroundView.webContents.isDestroyed()) return
        if (webContents.id !== backgroundWebContentsId) return

        const filename = item.getFilename().toLowerCase()
        if (!filename.endsWith('.csv')) return

        const savePath = path.join(app.getPath('temp'), `steam_history_${appId}_${Date.now()}.csv`);
        item.setSavePath(savePath);
        
        item.once('done', (_doneEvent, state) => {
            session.defaultSession.off('will-download', onWillDownload)
            if (state === 'completed') {
                console.log('Download completed:', savePath);
                processHistoryCSV(appId, savePath);
            } else {
                console.log(`Download failed: ${state}`);
            }
        });
    }
    session.defaultSession.on('will-download', onWillDownload);

    backgroundView.webContents.loadURL(url);
    
    // Wait for load then trigger CSV download
    backgroundView.webContents.once('did-finish-load', async () => {
        console.log('History page loaded. Triggering CSV download...');
        
        // Wait a bit for page interactivity
        setTimeout(async () => {
             // Script to find and click the "view as .csv" button/input
             // Based on screenshot: input[type="submit"][value="view as .csv"] inside a form
             const code = `
                (function() {
                    const btn = document.querySelector('input[value="view as .csv"]');
                    if (btn) {
                        btn.click();
                        return true;
                    }
                    // Fallback: Try to submit the form directly if button hidden
                    const form = document.querySelector('form[action*="report_csv.php"]');
                    if (form) {
                        form.submit();
                        return true;
                    }
                    return false;
                })()
            `;
            
            try {
                if (!backgroundView || backgroundView.webContents.isDestroyed()) {
                    session.defaultSession.off('will-download', onWillDownload)
                    return
                }
                const triggered = await backgroundView.webContents.executeJavaScript(code);
                if (triggered) {
                    console.log('CSV download triggered successfully.');
                } else {
                    console.error('Could not find CSV download button/form.');
                    session.defaultSession.off('will-download', onWillDownload)
                }
            } catch (e) {
                console.error('Failed to trigger CSV download:', e);
                session.defaultSession.off('will-download', onWillDownload)
            }
        }, 3000); 
    });
}

function processHistoryCSV(appId: string, filePath: string) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        // Parse CSV
        // Options: columns: true (detect headers), skip_empty_lines: true
        // The file usually has some metadata rows at the top before the header?
        // Or it's a clean CSV?
        // Steam CSVs usually have a header row first.
        
        // Let's read first few lines to check structure
        const lines = fileContent.split('\n');
        // Find header line index (containing "Date" and "Units")
        let headerIndex = 0;
        for(let i=0; i<Math.min(10, lines.length); i++) {
            if (lines[i].toLowerCase().includes('date') && lines[i].toLowerCase().includes('units')) {
                headerIndex = i;
                break;
            }
        }
        
        // Re-join from header onwards
        const cleanContent = lines.slice(headerIndex).join('\n');
        
        const records = parse<Record<string, string>>(cleanContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
        
        // Transform to our format: { date: string, value: number }
        // Detect column names dynamically
        const newHistory: { date: string; value: number }[] = [];
        
        if (records.length > 0) {
            const keys = Object.keys(records[0]);
            // Find Date key
            const dateKey = keys.find(k => k.toLowerCase().includes('date'));
            // Find Units key (Total Units, Steam Units, etc.)
            const unitsKey = keys.find(k => k.toLowerCase().includes('total units') || k.toLowerCase().includes('units'));
            
            if (dateKey && unitsKey) {
                for (const row of records) {
                    const dateStr = row[dateKey];
                    const unitsStr = row[unitsKey];
                    if (dateStr && unitsStr) {
                         // Parse date to standard format YYYY-MM-DD if needed
                         // Steam dates might be "Feb 21, 2026" or "2026-02-21"
                         // Let's leave as string for now, but sort later?
                         // Recharts needs consistent date format.
                         // Let's assume standard format or try to normalize.
                         
                         // Clean units
                         const val = parseInt(unitsStr.replace(/,/g, '')) || 0;
                         
                         // Normalize date to YYYY-MM-DD
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
        
        // Merge with existing store (deduplicate)
        // Actually, since we downloaded "All History", we can just overwrite.
        // But user mentioned incremental.
        // If we download "All History" every time, overwriting is fine and simpler.
        // It ensures corrections are applied too.
        
        // Sort by date
        newHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Save
        const store = loadHistoryStore();
        store[appId] = {
            lastUpdated: Date.now(),
            data: newHistory
        };
        saveHistoryStore(store);
        
        console.log(`Processed ${newHistory.length} history records for ${appId}.`);
        
        // Send to renderer
        win?.webContents.send('steam-history-update', { appId, history: newHistory });
        
        // Cleanup temp file
        fs.unlinkSync(filePath);
        
    } catch (e) {
        console.error('Error processing history CSV:', e);
    }
}

function fetchWishlist(appId: string) {
    if (!backgroundView) {
        createBackgroundView();
        if (!backgroundView) return;
    }

    const store = loadWishlistStore();
    const appWishlist = store[appId];

    if (appWishlist && appWishlist.data.length > 0) {
        win?.webContents.send('steam-wishlist-update', { appId, wishlist: appWishlist.data, currentOutstanding: appWishlist.currentOutstanding ?? null });
    }

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
            } catch (e) {
                console.error('Failed to trigger wishlist csv download:', e);
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
            if (
                line.includes('date') &&
                (line.includes('wishlist') || line.includes('add') || line.includes('outstanding') || line.includes('balance'))
            ) {
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

async function scrapePortfolioData() {
   if (!steamView || steamView.webContents.isDestroyed()) return
 
   const code = `
     (function() {
       try {
         const data = { type: 'portfolio', games: [] };
         
         // Helper to clean text
         const cleanText = (text) => text ? text.replace(/\\s+/g, ' ').trim() : '';
         
         // Find all rows in the document
        const rows = Array.from(document.querySelectorAll('tr'));
        
        // Extract Company-wide stats (usually at top)
        // Look for rows with "Lifetime revenue", "Steam units", etc.
        // The screenshot shows:
        // ACTIDIMENSION... Lifetime revenue | $147,297
        // ... Steam units | 29,872
        
        // Helper to find value in row by label
        const findStat = (labelPattern) => {
            for (const row of rows) {
                if (row.innerText.match(labelPattern)) {
                    // usually value is in the last cell or second cell
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 0) {
                        return cells[cells.length - 1].innerText.trim();
                    }
                }
            }
            return null;
        };

        data.lifetimeRevenue = findStat(/Lifetime revenue/i);
        data.steamUnits = findStat(/Steam units/i);
        data.retailActivations = findStat(/retail activations/i);
        data.totalUnits = findStat(/lifetime units total/i) || findStat(/Total units/i);
        
        // Also get company name from h2 or title
        const companyHeader = document.querySelector('h2');
        if (companyHeader && companyHeader.innerText.includes('Steam Stats')) {
             data.title = companyHeader.innerText.replace('Steam Stats - ', '').trim();
        }

        // Try to identify column indices from header
         let unitsColIndex = -1;
         let rankColIndex = -1;
         
         // Look for header row safely
         const headerRow = Array.from(document.querySelectorAll('tr')).find(r => 
             r.innerText.toLowerCase().includes('rank') && 
             (r.innerText.toLowerCase().includes('units') || r.innerText.toLowerCase().includes('product'))
         ) || rows[0];
         
         if (headerRow) {
             const cells = headerRow.querySelectorAll('th, td');
             for (let i = 0; i < cells.length; i++) {
                 const text = cells[i].innerText.toLowerCase();
                 if (text.includes('rank')) rankColIndex = i;
                 if ((text.includes('units') && (text.includes('current') || text.includes('today'))) || text === 'current units') unitsColIndex = i;
             }
         }

        for (const row of rows) {
             const link = row.querySelector('a[href*="/app/details/"]');
             
             // Ensure this row actually has cells and looks like a product row
             const cells = row.querySelectorAll('td');
             
             if (link && cells.length >= 3) {
                 const name = cleanText(link.innerText);
                 const href = link.getAttribute('href');
                 const appIdMatch = href.match(/app\\/details\\/(\\d+)/);
                 const appId = appIdMatch ? appIdMatch[1] : null;
                 
                 if (appId) {
                      let rank = '0';
                      let units = '0';
                      
                      // Strategy 1: Use identified column indices
                      if (unitsColIndex > -1 && cells[unitsColIndex]) {
                          units = cleanText(cells[unitsColIndex].innerText);
                      }
                      if (rankColIndex > -1 && cells[rankColIndex]) {
                          rank = cleanText(cells[rankColIndex].innerText);
                      }

                      // Strategy 2: Fallback to relative position (Link -> Rank -> Units)
                      if (units === '0' && rank === '0') {
                          const linkParentCell = link.closest('td');
                          if (linkParentCell) {
                              // Find index of this cell
                              const cellIndex = Array.from(row.children).indexOf(linkParentCell);
                              if (cellIndex > -1) {
                                  // Assume Rank is next, Units is next next
                                  if (cells[cellIndex + 1]) rank = cleanText(cells[cellIndex + 1].innerText);
                                  if (cells[cellIndex + 2]) units = cleanText(cells[cellIndex + 2].innerText);
                              }
                          }
                      }
                      
                      data.games.push({
                          name,
                          appId,
                          rank,
                          units
                      });
                 }
             }
         }
         
         return data;
       } catch (e) {
         return { error: e.message };
       }
     })()
   `

  try {
    const result = await steamView.webContents.executeJavaScript(code)
    console.log('Scraped Portfolio Data:', result)
    win?.webContents.send('steam-data-update', result)
  } catch (e) {
    console.error('Portfolio Scraping failed:', e)
  }
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
    console.log(`Navigating back to portfolio: ${STEAM_URL}`)
    steamView.webContents.loadURL(STEAM_URL)
})

// IPC to toggle dashboard
ipcMain.on('toggle-dashboard', (_event, show) => {
  setDashboardVisibility(show)
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

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
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
