import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Activity, X, ArrowUpRight, TrendingUp, RefreshCw, Palette, Clock3, Languages, ArrowLeft, AlertTriangle } from 'lucide-react'
import CountUp from 'react-countup'
import { ipcRenderer } from 'electron'
import { format } from 'date-fns'
import { cn } from '../lib/utils'
import SalesAnalysis from './SalesAnalysis'
import ExtendedMetrics from './ExtendedMetrics'
import ErrorBoundary from './ErrorBoundary'
import AdvancedInsights from './AdvancedInsights'
import WishlistInsights from './WishlistInsights'

interface DashboardProps {
  data: {
    lifetimeRevenueGross?: string
    lifetimeRevenueNet?: string
    lifetimeUnits?: string
    todayRevenue?: string
    todayUnits?: string
    wishlists?: string
    dailyActiveUsers?: string
    currentPlayers?: string
    title?: string
    appId?: string
    history?: { date: string; value: number }[]
    currentOutstandingWishlist?: number | null
    wishlistHistory?: {
      date: string
      additions: number
      deletions: number
      purchases: number
      gifts: number
      balance: number
      net: number
    }[]
    type?: string
  } | null
  onClose: () => void
  onBack: () => void
}

export default function Dashboard({ data, onClose, onBack }: DashboardProps) {
  const [refreshInterval, setRefreshInterval] = useState(300000) // 5 minutes default
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [theme, setTheme] = useState<'mono' | 'neon' | 'amber'>(() => {
    const saved = window.localStorage.getItem('dashboard.theme')
    if (saved === 'mono' || saved === 'neon' || saved === 'amber') return saved
    return 'mono'
  })
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [locale, setLocale] = useState<'en' | 'zh-CN'>(() => {
    const saved = window.localStorage.getItem('dashboard.locale')
    if (saved === 'en' || saved === 'zh-CN') return saved
    return 'en'
  })
  const [localeMenuOpen, setLocaleMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'sales' | 'wishlist'>('sales')
  const [utcNow, setUtcNow] = useState(new Date())
  const [showNoDataHint, setShowNoDataHint] = useState(false)

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    ipcRenderer.send('refresh-data')
    // Reset refreshing state after a delay (simulated, or listen for update)
    setTimeout(() => {
        setIsRefreshing(false)
        setLastUpdated(new Date())
    }, 2000)
  }, [refreshInterval])

  useEffect(() => {
    const timer = setInterval(() => {
      handleRefresh()
    }, refreshInterval)

    return () => clearInterval(timer)
  }, [refreshInterval, handleRefresh])

  useEffect(() => {
    const timer = setInterval(() => setUtcNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('dashboard.theme', theme)
  }, [theme])

  useEffect(() => {
    window.localStorage.setItem('dashboard.locale', locale)
  }, [locale])

  useEffect(() => {
    const hasSalesData = Boolean(data?.history && data.history.length > 0)
    const hasWishlistData = Boolean(data?.wishlistHistory && data.wishlistHistory.length > 0)
    const needsHint = activeTab === 'sales' ? !hasSalesData : !hasWishlistData
    if (!needsHint) {
      const reset = setTimeout(() => setShowNoDataHint(false), 0)
      return () => clearTimeout(reset)
    }
    const timer = setTimeout(() => setShowNoDataHint(true), 25000)
    return () => clearTimeout(timer)
  }, [activeTab, data?.history, data?.wishlistHistory])

  const parseCurrency = (str?: string) => {
    if (!str) return 0
    const cleaned = str.replace(/[^0-9.]/g, '')
    return parseFloat(cleaned) || 0
  }
  
  const parseNumber = (str?: string) => {
    if (!str) return 0
    const cleaned = str.replace(/[^0-9]/g, '')
    return parseInt(cleaned) || 0
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      // Removed staggerChildren to simplify and avoid hidden state issues
      transition: { duration: 0.5 }
    }
  }

  const themeStyles = {
    mono: {
      accentBg: 'bg-white',
      accentText: 'text-black',
      accentBorder: 'border-white/30',
      chipText: 'text-white',
      panelBorder: 'border-white/15',
      panelBg: 'bg-black/40'
    },
    neon: {
      accentBg: 'bg-cyan-400',
      accentText: 'text-black',
      accentBorder: 'border-cyan-400/50',
      chipText: 'text-cyan-300',
      panelBorder: 'border-cyan-300/35',
      panelBg: 'bg-cyan-950/20'
    },
    amber: {
      accentBg: 'bg-amber-400',
      accentText: 'text-black',
      accentBorder: 'border-amber-400/50',
      chipText: 'text-amber-300',
      panelBorder: 'border-amber-300/35',
      panelBg: 'bg-amber-950/20'
    }
  }[theme]

  const copy = locale === 'zh-CN'
    ? {
        lastUpdated: '最后更新',
        utcNow: 'UTC 当前',
        dayReset: '距日重置',
        nextRefresh: '下次刷新',
        projected: '今日预计收盘',
        trending: '趋势上升',
        revenueToday: '今日收入',
        unitsSold: '今日销量',
        wishlists: '愿望单',
        activeUsers: '活跃用户',
        totalRevenueNet: '总收入（净）',
        totalUnits: '总销量',
        currentPlayers: '当前玩家',
        grossRevenue: '总收入（毛）',
        currentOutstanding: '当前待实现愿望单',
        wishlistTotal: '愿望单总量',
        todayUnits: '今日销量',
        sales: '销量',
        wishlist: '愿望单',
        waitingSales: '等待历史销量数据',
        waitingWishlist: '等待愿望单数据',
        waitingSalesDesc: '后台正在抓取销量历史数据，请稍候。',
        waitingWishlistDesc: '后台正在抓取愿望单 CSV 数据，请稍候。',
        slowHint: '数据抓取时间较长，请先关闭 dashboard，检查外部 Steamworks 页面状态或登录态后再重开。',
        back: '返回列表'
      }
    : {
        lastUpdated: 'Last updated',
        utcNow: 'UTC NOW',
        dayReset: 'DAY RESET IN',
        nextRefresh: 'UPDATE IN',
        projected: 'Projected End of Day',
        trending: 'Trending Up',
        revenueToday: 'REVENUE (TODAY)',
        unitsSold: 'UNITS SOLD',
        wishlists: 'WISHLISTS',
        activeUsers: 'ACTIVE USERS',
        totalRevenueNet: 'Total Revenue (Net)',
        totalUnits: 'Total Units',
        currentPlayers: 'Current Players',
        grossRevenue: 'Gross Revenue',
        currentOutstanding: 'Current Outstanding',
        wishlistTotal: 'Wishlist Total',
        todayUnits: 'Today Units',
        sales: 'sales',
        wishlist: 'wishlist',
        waitingSales: 'Waiting for Historical Data',
        waitingWishlist: 'Waiting for Wishlist Data',
        waitingSalesDesc: 'The background process is fetching your sales history. This may take a moment.',
        waitingWishlistDesc: 'The background process is fetching wishlist CSV data. This may take a moment.',
        slowHint: 'Data fetch is taking longer than expected. Please close dashboard and check the external Steamworks page status/login, then reopen.',
        back: 'Back to List'
      }

  const currentOutstandingDisplay = (() => {
    if ((data?.currentOutstandingWishlist ?? 0) > 0) return data?.currentOutstandingWishlist ?? 0
    const lastBalance = data?.wishlistHistory?.[data.wishlistHistory.length - 1]?.balance ?? 0
    if (lastBalance > 0) return lastBalance
    return parseNumber(data?.wishlists)
  })()

  const getUtcResetInfo = () => {
    const next = new Date(utcNow)
    next.setUTCHours(24, 0, 0, 0)
    const diffMs = next.getTime() - utcNow.getTime()
    const totalSec = Math.max(0, Math.floor(diffMs / 1000))
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return {
      now: utcNow.toISOString().slice(11, 19),
      countdown: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
  }

  const getNextRefreshCountdown = () => {
    const nextTs = lastUpdated.getTime() + refreshInterval
    const diffMs = Math.max(0, nextTs - utcNow.getTime())
    const totalSec = Math.floor(diffMs / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white font-mono bg-grid-pattern relative overflow-hidden">
        {/* Loading State Background */}
        <div className="absolute inset-0 bg-gradient-to-t from-black to-gray-900 opacity-50"></div>
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
            <motion.div 
                className="h-full bg-white"
                animate={{ width: ["0%", "80%", "95%"] }}
                transition={{ duration: 5, ease: "circOut" }}
            />
        </div>
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }} 
          transition={{ duration: 2, repeat: Infinity }}
          className="relative z-10 text-sm tracking-widest uppercase"
        >
          Connecting to Steam Data Stream...
        </motion.div>
      </div>
    )
  }

  // Portfolio view handler (should be handled by App.tsx, but just in case)
  if (data.type === 'portfolio') {
      return null; // App.tsx renders PortfolioDashboard instead
  }

  // Determine Background Image URL (try library_hero, fallback to header)
  const bgImage = data.appId 
    ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${data.appId}/library_hero.jpg` 
    : '';

  return (
    <div className="relative mt-8 h-screen bg-black text-white font-sans overflow-hidden selection:bg-white selection:text-black">
      {/* Dynamic Background Layer (Fixed) */}
      {data.appId && (
        <div className="fixed inset-0 z-0 pointer-events-none">
            {/* Main Hero Image with Filters */}
            <div 
                className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-out"
                style={{ 
                    backgroundImage: `url(${bgImage})`,
                    opacity: 0.6, // Much brighter
                    filter: 'grayscale(20%) contrast(1.2) brightness(0.9)' // Less dark
                }}
            />
            {/* Gradient Mask to fade into black at the bottom */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black"></div>
            
            {/* Grid Pattern Overlay - Brighter */}
            <div className="absolute inset-0 bg-grid-pattern opacity-40 mix-blend-overlay"></div>
        </div>
      )}
      
      {!data.appId && <div className="fixed inset-0 z-0 bg-grid-pattern opacity-30 pointer-events-none"></div>}

      {/* Draggable Region */}
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      <div className="absolute top-0 left-0 right-0 h-8 z-40" style={{ WebkitAppRegion: 'drag' }} />

      {/* Scrollable Container */}
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden p-8 pt-10">
        
        {/* Loading Bar - When refreshing */}
        {isRefreshing && (
            <div className="fixed top-0 left-0 right-0 h-0.5 bg-white/20 z-50">
                <motion.div 
                    className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                />
            </div>
        )}

        <motion.div  
            variants={container}
            initial="hidden"
            animate="show"
            className="relative z-10 max-w-7xl mx-auto flex flex-col min-h-full pb-20"
        >
            {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={cn('flex justify-between items-start mb-12 border-b pb-6', themeStyles.panelBorder)}
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={cn('w-2 h-2 rounded-full animate-pulse', themeStyles.accentBg)}></span>
              <span className="font-mono text-xs text-gray-400 uppercase tracking-widest">
                {copy.lastUpdated}: {format(lastUpdated, 'HH:mm:ss')}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black leading-none uppercase tracking-normal">
              {(data.title || 'STEAM APP').toUpperCase()}
            </h1>
            <div className="mt-2 inline-flex items-center gap-2 bg-black/50 rounded-full text-[11px] font-mono text-gray-300 relative group">
              <Clock3 className="w-3.5 h-3.5" />
              <span>{copy.utcNow} {getUtcResetInfo().now}</span>
              <span className="text-gray-500">|</span>
              <span>{copy.dayReset} {getUtcResetInfo().countdown}</span>
              {utcNow.getUTCHours() < 5 && (
                 <div className="flex items-center gap-1 ml-1 text-yellow-500/80 cursor-help">
                    <span className="text-gray-500">|</span>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-zinc-900 border border-yellow-500/20 text-yellow-200/90 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal leading-tight">
                        Steam daily stats are often incomplete during UTC 00:00 - 05:00. Data may be lower than actual.
                    </div>
                 </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="relative">
                <button
                  onClick={() => setThemeMenuOpen(v => !v)}
                  title="Theme"
                  className={cn('flex items-center justify-center bg-black/50 backdrop-blur-md border rounded-lg w-9 h-9 cursor-pointer', themeStyles.panelBorder)}
                >
                  <Palette className={cn('w-3.5 h-3.5', themeStyles.chipText)} />
                </button>
                {themeMenuOpen && (
                  <div className={cn('absolute right-0 mt-2 w-36 border rounded-lg bg-black/95 backdrop-blur-md p-1 z-30', themeStyles.panelBorder)}>
                    {(['mono', 'neon', 'amber'] as const).map(key => (
                      <button
                        key={key}
                        onClick={() => {
                          setTheme(key)
                          setThemeMenuOpen(false)
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 text-xs font-mono uppercase rounded transition-colors',
                          theme === key ? cn(themeStyles.accentBg, themeStyles.accentText) : 'text-gray-300 hover:bg-white/10'
                        )}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                )}
             </div>
             <div className="relative">
                <button
                  onClick={() => setLocaleMenuOpen(v => !v)}
                  title="Language"
                  className={cn('flex items-center justify-center bg-black/50 backdrop-blur-md border rounded-lg w-9 h-9 cursor-pointer', themeStyles.panelBorder)}
                >
                  <Languages className={cn('w-3.5 h-3.5', themeStyles.chipText)} />
                </button>
                {localeMenuOpen && (
                  <div className={cn('absolute right-0 mt-2 w-36 border rounded-lg bg-black/95 backdrop-blur-md p-1 z-30', themeStyles.panelBorder)}>
                    <button
                      onClick={() => {
                        setLocale('en')
                        setLocaleMenuOpen(false)
                      }}
                      className={cn('w-full text-left px-3 py-2 text-xs font-mono rounded transition-colors', locale === 'en' ? cn(themeStyles.accentBg, themeStyles.accentText) : 'text-gray-300 hover:bg-white/10')}
                    >
                      English
                    </button>
                    <button
                      onClick={() => {
                        setLocale('zh-CN')
                        setLocaleMenuOpen(false)
                      }}
                      className={cn('w-full text-left px-3 py-2 text-xs font-mono rounded transition-colors', locale === 'zh-CN' ? cn(themeStyles.accentBg, themeStyles.accentText) : 'text-gray-300 hover:bg-white/10')}
                    >
                      简体中文
                    </button>
                  </div>
                )}
             </div>

             {/* Refresh Controls */}
             <div className={cn('flex items-center gap-2 bg-black/50 backdrop-blur-md border rounded-lg p-1', themeStyles.panelBorder)}>
                {[1, 3, 5, 10].map(m => (
                    <button
                        key={m}
                        onClick={() => setRefreshInterval(m * 60000)}
                        className={cn(
                            "px-3 py-1 text-xs font-mono font-bold rounded transition-colors",
                            refreshInterval === m * 60000 ? cn(themeStyles.accentBg, themeStyles.accentText) : "text-gray-400 hover:text-white"
                        )}
                    >
                        {m}m
                    </button>
                ))}
             </div>
             <span className="text-[11px] font-mono text-gray-400">
               {copy.nextRefresh} {getNextRefreshCountdown()}
             </span>

             <button 
                onClick={handleRefresh}
                className={cn(
                    "p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all border",
                    themeStyles.panelBorder,
                    isRefreshing && "animate-spin"
                )}
             >
                <RefreshCw className={cn('w-5 h-5', themeStyles.chipText)} />
             </button>

             <button
                onClick={onBack}
                className={cn('flex items-center gap-2 px-3 h-11 border rounded-full transition-colors bg-black/40 hover:bg-white/10 cursor-pointer', themeStyles.panelBorder)}
             >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs font-mono">{copy.back}</span>
             </button>

             <button 
                onClick={onClose}
                className={cn('group relative w-11 h-11 flex items-center justify-center shrink-0 overflow-hidden border rounded-full hover:border-white transition-colors cursor-pointer', themeStyles.accentBorder)}
             >
                <X className="w-5 h-5 relative z-10 transition-transform group-hover:rotate-90" />
                <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
                <X className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black opacity-0 group-hover:opacity-100 z-20 transition-opacity" />
             </button>
          </div>
        </motion.div>

        {activeTab === 'sales' ? (
          <>
            <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border mb-12', themeStyles.panelBorder)}>
              <StatCard 
                label={copy.revenueToday}
                value={parseCurrency(data.todayRevenue)} 
                prefix="$"
                delay={0}
                trend="+12%"
                borderClass={themeStyles.panelBorder}
                accentBg={themeStyles.accentBg}
                accentText={themeStyles.accentText}
                panelBg={themeStyles.panelBg}
              />
              <StatCard 
                label={copy.unitsSold}
                value={parseNumber(data.todayUnits)} 
                delay={0.1}
                borderClass={themeStyles.panelBorder}
                accentBg={themeStyles.accentBg}
                accentText={themeStyles.accentText}
                panelBg={themeStyles.panelBg}
              />
              <StatCard 
                label={copy.wishlists}
                value={parseNumber(data.wishlists)} 
                delay={0.2}
                borderClass={themeStyles.panelBorder}
                accentBg={themeStyles.accentBg}
                accentText={themeStyles.accentText}
                panelBg={themeStyles.panelBg}
              />
              <StatCard 
                label={copy.activeUsers}
                value={parseNumber(data.dailyActiveUsers) || parseNumber(data.currentPlayers)} 
                delay={0.3}
                highlight
                borderClass={themeStyles.panelBorder}
                accentBg={themeStyles.accentBg}
                accentText={themeStyles.accentText}
                panelBg={themeStyles.panelBg}
              />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12"
            >
                <div className={cn('p-6 relative overflow-hidden group h-full flex flex-col justify-between border', themeStyles.panelBorder, themeStyles.panelBg)}>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest">{copy.projected}</h3>
                            <ArrowUpRight className="w-5 h-5" />
                        </div>
                        <div className="text-5xl font-bold mb-2 tracking-tighter">
                            $<CountUp end={parseCurrency(data.todayRevenue) * 1.5} prefix="" decimals={0} duration={2.5} />
                        </div>
                        <div className={cn('inline-flex items-center gap-2 px-2 py-1 text-xs font-bold uppercase', themeStyles.accentBg, themeStyles.accentText)}>
                            <TrendingUp className="w-3 h-3" />
                            {copy.trending}
                        </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-gray-200 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
                </div>

                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <div className={cn('p-6 border backdrop-blur-sm', themeStyles.panelBorder, themeStyles.panelBg)}>
                        <div className="text-gray-500 font-mono text-xs uppercase mb-2">{copy.totalRevenueNet}</div>
                        <div className="text-3xl font-bold font-mono tracking-tight">
                            $<CountUp end={parseCurrency(data.lifetimeRevenueNet)} separator="," />
                        </div>
                    </div>
                    <div className={cn('p-6 border backdrop-blur-sm', themeStyles.panelBorder, themeStyles.panelBg)}>
                        <div className="text-gray-500 font-mono text-xs uppercase mb-2">{copy.totalUnits}</div>
                        <div className="text-3xl font-bold font-mono tracking-tight">
                            <CountUp end={parseNumber(data.lifetimeUnits)} separator="," />
                        </div>
                    </div>
                    <div className={cn('p-6 border backdrop-blur-sm', themeStyles.panelBorder, themeStyles.panelBg)}>
                        <div className="text-gray-500 font-mono text-xs uppercase mb-2">{copy.currentPlayers}</div>
                        <div className="text-3xl font-bold font-mono tracking-tight flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <CountUp end={parseNumber(data.currentPlayers)} separator="," />
                        </div>
                    </div>
                    <div className={cn('p-6 border backdrop-blur-sm', themeStyles.panelBorder, themeStyles.panelBg)}>
                        <div className="text-gray-500 font-mono text-xs uppercase mb-2">{copy.grossRevenue}</div>
                        <div className="text-3xl font-bold font-mono tracking-tight">
                            $<CountUp end={parseCurrency(data.lifetimeRevenueGross)} separator="," />
                        </div>
                    </div>
                </div>
            </motion.div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <div className={cn('p-6 border backdrop-blur-sm', themeStyles.panelBorder, themeStyles.panelBg)}>
              <div className="text-gray-500 font-mono text-xs uppercase mb-2">{copy.currentOutstanding}</div>
                <div className="text-3xl font-bold font-mono tracking-tight">
                <CountUp end={currentOutstandingDisplay} separator="," />
              </div>
            </div>
            <div className={cn('p-6 border backdrop-blur-sm', themeStyles.panelBorder, themeStyles.panelBg)}>
              <div className="text-gray-500 font-mono text-xs uppercase mb-2">{copy.wishlistTotal}</div>
              <div className="text-3xl font-bold font-mono tracking-tight">
                <CountUp end={parseNumber(data.wishlists)} separator="," />
              </div>
            </div>
            <div className={cn('p-6 border backdrop-blur-sm', themeStyles.panelBorder, themeStyles.panelBg)}>
              <div className="text-gray-500 font-mono text-xs uppercase mb-2">{copy.todayUnits}</div>
              <div className="text-3xl font-bold font-mono tracking-tight">
                <CountUp end={parseNumber(data.todayUnits)} separator="," />
              </div>
            </div>
            <div className={cn('p-6 border backdrop-blur-sm', themeStyles.panelBorder, themeStyles.panelBg)}>
              <div className="text-gray-500 font-mono text-xs uppercase mb-2">{copy.currentPlayers}</div>
              <div className="text-3xl font-bold font-mono tracking-tight">
                <CountUp end={parseNumber(data.currentPlayers)} separator="," />
              </div>
            </div>
          </div>
        )}

        <div className={cn('flex items-center bg-black/50 backdrop-blur-md border rounded-lg p-1 mb-8 w-fit', themeStyles.panelBorder)}>
          {(['sales', 'wishlist'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 text-xs font-mono font-bold rounded transition-colors uppercase',
                activeTab === tab ? cn(themeStyles.accentBg, themeStyles.accentText) : 'text-gray-400 hover:text-white'
              )}
            >
              {tab === 'sales' ? copy.sales : copy.wishlist}
            </button>
          ))}
        </div>

        {/* Deep Analysis Section */}
        <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-8"
        >
            {activeTab === 'sales' && data.history && data.history.length > 0 ? (
                <>
                    <ErrorBoundary componentName="SalesAnalysis">
                        <SalesAnalysis history={data.history} />
                    </ErrorBoundary>
                    <ErrorBoundary componentName="ExtendedMetrics">
                        <ExtendedMetrics history={data.history} />
                    </ErrorBoundary>
                    <ErrorBoundary componentName="AdvancedInsights">
                        <AdvancedInsights history={data.history} locale={locale} />
                    </ErrorBoundary>
                </>
            ) : activeTab === 'wishlist' && data.wishlistHistory && data.wishlistHistory.length > 0 ? (
                <ErrorBoundary componentName="WishlistInsights">
                    <WishlistInsights history={data.wishlistHistory} locale={locale} currentOutstanding={currentOutstandingDisplay} />
                </ErrorBoundary>
            ) : (
                <div className={cn('border p-12 text-center backdrop-blur-sm', themeStyles.panelBorder, themeStyles.panelBg)}>
                    <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">
                      {activeTab === 'sales' ? copy.waitingSales : copy.waitingWishlist}
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        {activeTab === 'sales'
                          ? copy.waitingSalesDesc
                          : copy.waitingWishlistDesc}
                    </p>
                    {showNoDataHint && (
                      <p className="text-amber-300 text-sm mt-4 font-mono">
                        {copy.slowHint}
                      </p>
                    )}
                </div>
            )}
        </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  prefix?: string
  delay: number
  highlight?: boolean
  trend?: string
  borderClass: string
  accentBg: string
  accentText: string
  panelBg: string
}

function StatCard({ label, value, prefix = "", delay, highlight, borderClass, accentBg, accentText, panelBg }: StatCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 + delay, duration: 0.8 }}
      className={cn('p-8 relative group overflow-hidden border', borderClass, panelBg, highlight ? cn(accentBg, accentText) : 'text-white')}
    >
      <div className="flex flex-col h-full justify-between relative z-10">
        <div className={cn('text-xs font-mono uppercase tracking-widest mb-4', highlight ? 'text-black/60' : 'text-gray-500')}>
          {label}
        </div>
        <div className="text-5xl font-bold tracking-tighter">
          {prefix}
          <CountUp end={value} duration={2.5} separator="," />
        </div>
      </div>
      
      {/* Subtle hover reveal */}
      {!highlight && (
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      )}
    </motion.div>
  )
}
