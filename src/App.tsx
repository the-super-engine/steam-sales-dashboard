import { useState, useEffect } from 'react'
import { ipcRenderer } from 'electron'
import { AnimatePresence, motion } from 'framer-motion'
import Dashboard from './components/Dashboard'
import PortfolioDashboard from './components/PortfolioDashboard'
import UpdateModal from './components/UpdateModal'

type PortfolioGame = {
  name: string
  appId: string
  rank: string
  units: string
}
type PortfolioDashboardData = {
  type: 'portfolio'
  games: PortfolioGame[]
  title?: string
  lifetimeRevenue?: string
  steamUnits?: string
  retailActivations?: string
  totalUnits?: string
}

type PlaytimeData = {
  lifetimeUsers: number
  avgMinutes: number
  medianMinutes: number
  rangeMinStr: string
  rangeMaxStr: string
  retention: Array<{ threshold: string; minutes: number; percentage: number }>
}

type PlayersData = {
  summary: {
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
  peakConcurrent: Array<{ date: string; value: number }>
  dailyActive: Array<{ date: string; value: number }>
}

type AppDashboardData = {
  type?: 'portfolio'
  appId?: string
  history?: Array<{ date: string; value: number }>
  historyNoData?: boolean
  currentOutstandingWishlist?: number | null
  wishlistHistory?: Array<{
    date: string
    additions: number
    deletions: number
    purchases: number
    gifts: number
    balance: number
    net: number
  }>
  wishlistNoData?: boolean
  playtime?: PlaytimeData
  players?: PlayersData
  [key: string]: unknown
}

type DashboardData = PortfolioDashboardData | AppDashboardData | null

function App() {
  const [isVisible, setIsVisible] = useState(false)
  const [data, setData] = useState<DashboardData>(null)
  const [portfolioAllHistory, setPortfolioAllHistory] = useState<PortfolioDashboardData['games'] | null>(null)
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean
    latestVersion: string
    currentVersion: string
    releasesUrl: string
  } | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)

  useEffect(() => {
    // Check for updates on mount
    ipcRenderer.invoke('check-for-update').then((result) => {
        console.log('Update check result:', result)
        if (result && result.hasUpdate) {
            setUpdateInfo(result)
            setShowUpdateModal(true)
        }
    }).catch(err => console.error('Auto update check failed:', err))
  }, [])

  useEffect(() => {
    // Listen for data updates
    ipcRenderer.on('steam-data-update', (_event, newData) => {
      console.log('Received data:', newData)
      setData(prev => ({ ...(prev ?? {}), ...newData }))
      setIsVisible(true)
    })

    // Listen for history updates
    ipcRenderer.on('steam-history-update', (_event, { appId, history }) => {
        console.log('Received history:', history)
        setData(prev => {
            if (prev && 'appId' in prev && prev.appId && appId && prev.appId !== appId) return prev
            return { ...(prev ?? {}), history, appId }
        })
        setIsVisible(true)
    })

    ipcRenderer.on('steam-wishlist-update', (_event, { appId, wishlist, currentOutstanding, noData }) => {
      console.log('Received wishlist update, noData:', noData)
      setData(prev => {
        if (prev && 'appId' in prev && prev.appId && appId && prev.appId !== appId) return prev
        return { ...(prev ?? {}), wishlistHistory: wishlist, currentOutstandingWishlist: currentOutstanding, wishlistNoData: Boolean(noData), appId }
      })
      setIsVisible(true)
    })

    ipcRenderer.on('steam-history-no-data', (_event, { appId }) => {
      console.log('Received history-no-data for', appId)
      setData(prev => {
        if (prev && 'appId' in prev && prev.appId && appId && prev.appId !== appId) return prev
        return { ...(prev ?? {}), historyNoData: true, appId }
      })
    })

    ipcRenderer.on('steam-playtime-update', (_event, { appId, playtime }) => {
      console.log('Received playtime update for', appId)
      setData(prev => {
        if (prev && 'appId' in prev && prev.appId && appId && prev.appId !== appId) return prev
        return { ...(prev ?? {}), playtime, appId }
      })
    })

    ipcRenderer.on('steam-players-update', (_event, { appId, players }) => {
      console.log('Received players update for', appId)
      setData(prev => {
        if (prev && 'appId' in prev && prev.appId && appId && prev.appId !== appId) return prev
        return { ...(prev ?? {}), players, appId }
      })
    })

    ipcRenderer.on('steam-portfolio-all-history', (_event, payload: { games: PortfolioDashboardData['games']; title?: string; totalUnits?: string }) => {
      setPortfolioAllHistory(payload.games ?? null)
    })

    // Listen for dashboard visibility updates
    ipcRenderer.on('dashboard-visibility', (_event, visible) => {
      console.log('Received dashboard visibility:', visible)
      setIsVisible(Boolean(visible))
    })
    
    // Request initial visibility state in case we missed the event
    ipcRenderer.send('request-visibility-state')
    
    return () => {
      ipcRenderer.removeAllListeners('steam-data-update')
      ipcRenderer.removeAllListeners('steam-history-update')
      ipcRenderer.removeAllListeners('steam-history-no-data')
      ipcRenderer.removeAllListeners('steam-wishlist-update')
      ipcRenderer.removeAllListeners('steam-playtime-update')
      ipcRenderer.removeAllListeners('steam-players-update')
      ipcRenderer.removeAllListeners('steam-portfolio-all-history')
      ipcRenderer.removeAllListeners('dashboard-visibility')
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    // Wait for animation to finish before telling main process to hide
    setTimeout(() => {
        ipcRenderer.send('toggle-dashboard', false)
    }, 300)
  }

  const handleSelectGame = (appId: string) => {
    // Navigate the underlying Steam view
    ipcRenderer.send('navigate-to-app', appId)
    // Don't close the dashboard. Instead, set data to null or a loading state to indicate transition
    // But we need to switch from Portfolio view to Dashboard view.
    // The main process will detect the new URL and send 'steam-target-detected'.
    // However, until then, we might want to show a loading indicator.
    setData(null) // This will trigger the "Connecting..." screen in Dashboard component
  }

  const handleBackToPortfolio = () => {
    ipcRenderer.send('navigate-to-portfolio')
    setData(null)
  }

  return (
    <div className="h-screen bg-transparent overflow-hidden">
      <AnimatePresence>
        {isVisible && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full bg-black text-white"
            >
              {data?.type === 'portfolio' ? (
                <PortfolioDashboard
                  data={data as PortfolioDashboardData}
                  portfolioAllHistory={portfolioAllHistory}
                  onClose={handleClose}
                  onSelect={handleSelectGame}
                  onRequestAllHistory={() => ipcRenderer.send('request-portfolio-all-history')}
                />
              ) : (
                <Dashboard data={data} onClose={handleClose} onBack={handleBackToPortfolio} />
              )}
            </motion.div>
        )}
      </AnimatePresence>

      {updateInfo && (
        <UpdateModal 
            isOpen={showUpdateModal} 
            onClose={() => setShowUpdateModal(false)}
            latestVersion={updateInfo.latestVersion}
            currentVersion={updateInfo.currentVersion}
            releasesUrl={updateInfo.releasesUrl}
        />
      )}
    </div>
  )
}

export default App
