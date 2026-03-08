import { useState, useEffect } from 'react'
import { ipcRenderer } from 'electron'
import { AnimatePresence, motion } from 'framer-motion'
import Dashboard from './components/Dashboard'
import PortfolioDashboard from './components/PortfolioDashboard'

type PortfolioDashboardData = {
  type: 'portfolio'
  games: Array<{
    name: string
    appId: string
    rank: string
    units: string
  }>
  title?: string
  lifetimeRevenue?: string
  steamUnits?: string
  retailActivations?: string
  totalUnits?: string
}

type AppDashboardData = {
  type?: 'portfolio'
  appId?: string
  history?: Array<{ date: string; value: number }>
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
  [key: string]: unknown
}

type DashboardData = PortfolioDashboardData | AppDashboardData | null

function App() {
  const [isVisible, setIsVisible] = useState(false)
  const [data, setData] = useState<DashboardData>(null)

  useEffect(() => {
    // Listen for data updates
    ipcRenderer.on('steam-data-update', (_event, newData) => {
      console.log('Received data:', newData)
      // When data arrives, if we were not visible, we should probably become visible
      // Or maybe the main process controls visibility via another channel?
      // Actually main process manages the window visibility.
      // But we can animate content entrance.
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

    ipcRenderer.on('steam-wishlist-update', (_event, { appId, wishlist, currentOutstanding }) => {
      setData(prev => {
        if (prev && 'appId' in prev && prev.appId && appId && prev.appId !== appId) return prev
        return { ...(prev ?? {}), wishlistHistory: wishlist, currentOutstandingWishlist: currentOutstanding, appId }
      })
      setIsVisible(true)
    })

    ipcRenderer.on('dashboard-visibility', (_event, visible) => {
      setIsVisible(Boolean(visible))
    })

    // Listen for close request from within React to trigger animation
    // But closing is usually immediate via IPC.
    // Let's make the main process wait for our animation? 
    // Complicated. Let's just animate IN for now.
    
    return () => {
      ipcRenderer.removeAllListeners('steam-data-update')
      ipcRenderer.removeAllListeners('steam-history-update')
      ipcRenderer.removeAllListeners('steam-wishlist-update')
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
    <div className="min-h-screen bg-transparent overflow-hidden">
      <AnimatePresence>
        {isVisible && (
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="h-full w-full bg-black text-white"
            >
              {data?.type === 'portfolio' ? (
                <PortfolioDashboard data={data as PortfolioDashboardData} onClose={handleClose} onSelect={handleSelectGame} />
              ) : (
                <Dashboard data={data} onClose={handleClose} onBack={handleBackToPortfolio} />
              )}
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
