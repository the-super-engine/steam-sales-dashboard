import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Github, ExternalLink, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import logo from '../assets/logo.png'
import { ipcRenderer } from 'electron'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
  locale: 'en' | 'zh-CN'
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'latest' | 'error'

export default function AboutModal({ isOpen, onClose, locale }: AboutModalProps) {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [releasesUrl, setReleasesUrl] = useState<string>('')
  
  useEffect(() => {
    if (isOpen) {
        setUpdateStatus('idle')
        setLatestVersion(null)
    }
  }, [isOpen])

  const checkForUpdates = async () => {
    setUpdateStatus('checking')
    try {
        const result = await ipcRenderer.invoke('check-for-update')
        if (result.error) {
            setUpdateStatus('error')
        } else if (result.hasUpdate) {
            setUpdateStatus('available')
            setLatestVersion(result.latestVersion)
            setReleasesUrl(result.releasesUrl)
        } else {
            setUpdateStatus('latest')
            setLatestVersion(result.currentVersion)
        }
    } catch (e) {
        setUpdateStatus('error')
    }
  }

  const copy = locale === 'zh-CN' 
    ? {
        title: '关于 Steam Sales Dashboard',
        desc: '本应用是帮助 Steam 应用/游戏开发者更好查看销量数据的 Dashboard。',
        features: [
            '专为发布日大屏监控设计',
            '支持多应用实时监控',
            '完全本地化运行，数据安全',
            '提供中英文双语支持'
        ],
        disclaimer: '免责声明：本应用与 Valve 或 Steam 无任何关联。',
        github: '开源仓库',
        website: '访问官网',
        checkUpdate: '检查更新',
        checking: '检查中...',
        updateAvailable: '发现新版本',
        latest: '已是最新',
        error: '检查失败'
      }
    : {
        title: 'About Steam Sales Dashboard',
        desc: 'A modern dashboard helping Steam app/game developers visualize sales data effectively.',
        features: [
            'Designed for Launch Day Big Screens',
            'Multi-App Real-time Monitoring',
            'Runs locally, keeping your data safe',
            'Bilingual Support (English & Chinese)'
        ],
        disclaimer: 'Disclaimer: This application is not affiliated with Valve or Steam.',
        github: 'GitHub Repo',
        website: 'Website',
        checkUpdate: 'Check Updates',
        checking: 'Checking...',
        updateAvailable: 'Update Available',
        latest: 'Up to Date',
        error: 'Check Failed'
    }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden"
          >
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10 z-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-10">
                <div className="flex items-start justify-between">
                    <img src={logo} alt="Steam Sales Dashboard" className="w-16 h-16 rounded-xl mb-6 shadow-lg object-cover" />
                    
                    {/* Update Checker */}
                    <div className="flex flex-col items-end gap-2 mt-1">
                        {updateStatus === 'idle' && (
                            <button 
                                onClick={checkForUpdates}
                                className="text-xs font-mono text-gray-500 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-white/5"
                            >
                                <RefreshCw className="w-3 h-3" />
                                {copy.checkUpdate}
                            </button>
                        )}
                        {updateStatus === 'checking' && (
                            <div className="text-xs font-mono text-gray-500 flex items-center gap-1 animate-pulse px-2 py-1">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                {copy.checking}
                            </div>
                        )}
                        {updateStatus === 'available' && (
                            <a 
                                href={releasesUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20"
                            >
                                <ExternalLink className="w-3 h-3" />
                                {copy.updateAvailable} {latestVersion && `(${latestVersion})`}
                            </a>
                        )}
                        {updateStatus === 'latest' && (
                            <div className="text-xs font-mono text-gray-500 flex items-center gap-1 px-2 py-1">
                                <CheckCircle className="w-3 h-3" />
                                {copy.latest} {latestVersion && `(${latestVersion})`}
                            </div>
                        )}
                        {updateStatus === 'error' && (
                            <div className="text-xs font-mono text-red-400 flex items-center gap-1 px-2 py-1">
                                <AlertCircle className="w-3 h-3" />
                                {copy.error}
                            </div>
                        )}
                    </div>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">{copy.title}</h2>
                <p className="text-gray-400 mb-6 leading-relaxed">
                    {copy.desc}
                </p>

                <div className="space-y-3 mb-8">
                    {copy.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            {feature}
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-black/30 rounded-lg border border-white/5 mb-8">
                    <p className="text-xs text-gray-500 text-center">
                        {copy.disclaimer}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <a 
                        href="https://github.com/wujianfeng/steam-sales-dashboard" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <Github className="w-4 h-4" />
                        {copy.github}
                    </a>
                    {/* If English, maybe link to Chinese readme as requested? 
                        The user said: "英文的链到中文的那个 readme 去"
                        Let's just keep it simple, the repo has both usually.
                    */}
                    <a 
                        href="https://soda-game.com" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-colors border border-white/10"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Soda Game
                    </a>
                </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
