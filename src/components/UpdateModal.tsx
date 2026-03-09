import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Download } from 'lucide-react'
import { shell } from 'electron'
import { useState } from 'react'

interface UpdateModalProps {
    isOpen: boolean
    onClose: () => void
    latestVersion: string
    currentVersion: string
    releasesUrl: string
}

export default function UpdateModal({ isOpen, onClose, latestVersion, currentVersion, releasesUrl }: UpdateModalProps) {
    const [locale] = useState(() => {
        return window.localStorage.getItem('dashboard.locale') === 'zh-CN' ? 'zh-CN' : 'en'
    })

    if (!isOpen) return null

    const copy = locale === 'zh-CN' ? {
        title: '发现新版本！',
        desc: 'Steam Sales Dashboard 有新版本可用。立即下载以获取最新功能和修复。',
        download: '下载更新',
        later: '稍后提醒'
    } : {
        title: 'New Update Available!',
        desc: 'A new version of Steam Sales Dashboard is available. Download it now to get the latest features and fixes.',
        download: 'Download Update',
        later: 'Remind Me Later'
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                    
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col items-center text-center pt-2">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
                            <Download className="w-8 h-8 text-blue-400" />
                        </div>

                        <h2 className="text-xl font-bold text-white mb-2">{copy.title}</h2>
                        
                        <div className="flex items-center gap-3 text-sm font-mono mb-6 bg-black/30 px-4 py-2 rounded-lg border border-white/5">
                            <span className="text-gray-400">v{currentVersion}</span>
                            <span className="text-gray-600">→</span>
                            <span className="text-green-400 font-bold">v{latestVersion}</span>
                        </div>

                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                            {copy.desc}
                        </p>

                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={() => {
                                    shell.openExternal(releasesUrl)
                                    onClose()
                                }}
                                className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <ExternalLink className="w-4 h-4" />
                                {copy.download}
                            </button>
                            
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-transparent text-gray-400 font-medium rounded-lg hover:text-white hover:bg-white/5 transition-colors"
                            >
                                {copy.later}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
