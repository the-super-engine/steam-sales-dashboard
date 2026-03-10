import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, TrendingUp, ArrowRight, Info, LogOut } from 'lucide-react'
import CountUp from 'react-countup'
import { ipcRenderer } from 'electron'
import AboutModal from './AboutModal'
import { translations, type Locale } from '../lib/locales'

interface PortfolioData {
  type: 'portfolio'
  games: {
    name: string
    appId: string
    rank: string
    units: string
  }[]
  title?: string
  lifetimeRevenue?: string
  steamUnits?: string
  retailActivations?: string
  totalUnits?: string
}

type PortfolioGameItem = PortfolioData['games'][number]

interface PortfolioDashboardProps {
  data: PortfolioData
  portfolioAllHistory: PortfolioGameItem[] | null
  onClose: () => void
  onSelect: (appId: string) => void
  onRequestAllHistory: () => void
}

export default function PortfolioDashboard({ data, portfolioAllHistory, onClose, onSelect, onRequestAllHistory }: PortfolioDashboardProps) {
  const [aboutOpen, setAboutOpen] = useState(false)
  const [range, setRange] = useState<'today' | 'all-history'>('today')
  const [locale] = useState<Locale>(() => {
    const saved = window.localStorage.getItem('dashboard.locale')
    if (saved === 'en' || saved === 'zh-CN') return saved as Locale
    return 'en'
  })
  const t = translations[locale]

  const isAllHistory = range === 'all-history'
  const gamesToShow = isAllHistory ? (portfolioAllHistory ?? []) : data.games
  const sortedGames = [...gamesToShow].sort((a, b) => {
    const rankA = parseInt(a.rank) || 999
    const rankB = parseInt(b.rank) || 999
    return rankA - rankB
  })

  const totalUnits = sortedGames.reduce((acc, game) => {
    return acc + (parseInt(game.units.replace(/,/g, '')) || 0)
  }, 0)

  const handleRangeChange = (next: 'today' | 'all-history') => {
    setRange(next)
    if (next === 'all-history' && !portfolioAllHistory) onRequestAllHistory()
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const el = scrollRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const canScrollUp = scrollTop > 0 && e.deltaY < 0
    const canScrollDown = scrollTop < scrollHeight - clientHeight - 1 && e.deltaY > 0
    if (canScrollUp || canScrollDown) {
      el.scrollTop += e.deltaY
      e.preventDefault()
    }
  }, [])

  return (
    <div className="relative min-h-screen bg-black text-white font-sans overflow-hidden selection:bg-white selection:text-black">
      {/* Background Grid - full bleed */}
      <div className="absolute inset-0 z-0 bg-grid-pattern opacity-10 pointer-events-none" />

      {/* Draggable Region */}
      <div className="absolute top-0 left-0 right-0 h-8 z-50 pointer-events-none">
        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
        {/* @ts-ignore */}
        <div className="w-full h-full" style={{ WebkitAppRegion: 'drag' }} />
      </div>

      {/* Full-viewport scroll layer: keeps 全屏 feel, content scrolls inside */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="dashboard-scroll fixed inset-0 z-10 overflow-y-auto overscroll-behavior-y-contain"
      >
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative min-h-full max-w-7xl mx-auto flex flex-col p-8 pt-16 pb-20"
        >
        {/* Header */}
        <motion.div variants={item} className="flex justify-between items-end mt-8 mb-12 border-b border-white/10 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">{t.globalPortfolio}</span>
            </div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-5xl md:text-6xl font-bold leading-none">
                {data.title || 'ALL APPS'}
              </h1>
              <button
                 onClick={() => setAboutOpen(true)}
                 className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5 z-50"
                 // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                 // @ts-ignore
                 style={{ WebkitAppRegion: 'no-drag' }}
              >
                 <Info className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-gray-400 font-mono text-sm">
              <TrendingUp className="w-4 h-4 text-white" />
              {isAllHistory ? t.totalUnitsAllHistory : t.totalUnitsToday}: <span className="text-white font-bold"><CountUp end={totalUnits} duration={2} separator="," /></span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-black/50 backdrop-blur-md border border-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => handleRangeChange('today')}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-colors ${range === 'today' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
              >
                {t.portfolioRangeToday}
              </button>
              <button
                type="button"
                onClick={() => handleRangeChange('all-history')}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-colors ${range === 'all-history' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
              >
                {t.portfolioRangeAllHistory}
              </button>
            </div>
            <button
                onClick={onClose}
                className="group relative w-12 h-12 flex items-center justify-center shrink-0 overflow-hidden border border-white/20 rounded-full hover:border-white transition-colors z-50"
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                style={{ WebkitAppRegion: 'no-drag' }}
            >
                <X className="w-6 h-6 relative z-10 transition-transform group-hover:rotate-90" />
                <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
                <X className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black opacity-0 group-hover:opacity-100 z-20 transition-opacity" />
            </button>
          </div>
        </motion.div>
        <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} locale={locale} />

        {/* Games Grid - Selector Style */}
        {isAllHistory && !portfolioAllHistory ? (
          <div className="py-16 text-center text-gray-400 font-mono text-sm">
            {t.portfolioRangeAllHistory} …
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedGames.map((game) => (
              <GameCard key={game.appId} game={game} onSelect={() => onSelect(game.appId)} locale={locale} showAllHistoryLabel={isAllHistory} />
            ))}
          </div>
        )}

      {/* Footer */}
      <div className="mt-auto pt-16 flex flex-col items-center justify-center gap-6 pointer-events-auto pb-8">
        <button
            onClick={() => {
                if (confirm(t.signOutConfirm)) {
                    ipcRenderer.send('logout')
                }
            }}
            className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg transition-colors text-xs font-mono uppercase tracking-widest z-50"
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            style={{ WebkitAppRegion: 'no-drag' }}
        >
            <LogOut className="w-4 h-4" />
            {t.signOut}
        </button>

        <div className="flex items-center gap-6 opacity-60 hover:opacity-100 transition-opacity">
            <a 
                href="https://soda-game.com" 
                target="_blank" 
                rel="noreferrer" 
                className="text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-widest flex items-center gap-2"
            >
                POWERED BY SODA GAME
            </a>
            <span className="text-gray-700">|</span>
            <a 
                href="https://vibart.ai" 
                target="_blank" 
                rel="noreferrer" 
                className="text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-widest flex items-center gap-2"
            >
                VIBART AI
            </a>
        </div>
      </div>
        </motion.div>
      </div>
    </div>
  )
}

const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps'

function GameCard({ game, onSelect, locale, showAllHistoryLabel }: { game: PortfolioGameItem, onSelect: () => void, locale: Locale, showAllHistoryLabel?: boolean }) {
  const units = parseInt(game.units.replace(/,/g, '')) || 0;
  const t = translations[locale]
  const [imgSrc, setImgSrc] = useState(`${STEAM_CDN}/${game.appId}/library_hero.jpg`)
  const [noImage, setNoImage] = useState(false)

  const handleImgError = () => {
    if (imgSrc.includes('library_hero')) {
      setImgSrc(`${STEAM_CDN}/${game.appId}/header.jpg`)
    } else {
      setNoImage(true)
    }
  }

  return (
    <motion.button 
      variants={{
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
      }}
      onClick={onSelect}
      className="group relative bg-black border border-white/10 overflow-hidden h-[240px] hover:border-white transition-colors w-full text-left focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
    >
      {/* Background: image or gradient placeholder when no image */}
      <div className="absolute inset-0 overflow-hidden">
        {noImage ? (
          <div
            className="absolute inset-0 opacity-70 group-hover:opacity-90 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f0f1a 100%)',
            }}
          />
        ) : (
          <img
            src={imgSrc}
            alt=""
            onError={handleImgError}
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-95 saturate-110"
          />
        )}
      </div>
      {/* Heavy gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent group-hover:via-black/40 transition-colors"></div>

      {/* Content */}
      <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
        <div className="flex justify-between items-start">
           <div className="font-mono text-xs text-gray-300 bg-black/40 backdrop-blur-sm border border-white/10 px-2 py-1 rounded group-hover:bg-white group-hover:text-black transition-colors">
             {t.rank} #{game.rank}
           </div>
           {units > 0 && (
             <div className="flex items-center gap-1 text-xs font-bold text-green-400 bg-black/50 backdrop-blur-sm px-2 py-1 rounded border border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.2)]">
               <TrendingUp className="w-3 h-3" />
               {t.active}
             </div>
           )}
        </div>

        <div>
          <h3 className="text-2xl font-bold leading-tight mb-3 text-white drop-shadow-md line-clamp-2">
            {game.name}
          </h3>
          
          <div className="flex justify-between items-end border-t border-white/20 pt-3 group-hover:border-white/50 transition-colors">
             <div>
                <div className="text-xs text-gray-300 font-mono mb-0.5 uppercase">
                  {showAllHistoryLabel ? t.unitsAllHistory : t.unitsToday}
                </div>
                <div className="text-3xl font-bold tracking-tighter text-white">
                  <CountUp end={units} duration={1.5} separator="," />
                </div>
             </div>
             
             <div className="p-2 rounded-full border border-white/30 group-hover:bg-white group-hover:text-black transition-colors transform translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 duration-300">
               <ArrowRight className="w-5 h-5" />
             </div>
          </div>
        </div>
      </div>
    </motion.button>
  )
}
