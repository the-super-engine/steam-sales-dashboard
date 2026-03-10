import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, Cell, Legend,
} from 'recharts'
import { Clock, Users, Activity, Zap, Monitor } from 'lucide-react'
import CountUp from 'react-countup'
import { translations, type Locale } from '../lib/locales'

type RetentionRow = { threshold: string; minutes: number; percentage: number }

export type PlaytimeData = {
  lifetimeUsers: number
  avgMinutes: number
  medianMinutes: number
  rangeMinStr: string
  rangeMaxStr: string
  retention: RetentionRow[]
}

export type PlayersData = {
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

interface PlaytimeInsightsProps {
  data: PlaytimeData
  players?: PlayersData
  locale?: Locale
}

type PlayerRange = '30D' | '90D' | '180D' | 'ALL'

const tooltipStyle = {
  cursor: { fill: 'rgba(255,255,255,0.08)' },
  contentStyle: { backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' },
  itemStyle: { color: '#fff', fontFamily: 'monospace', fontSize: '11px' },
  labelStyle: { color: '#888', marginBottom: '2px', fontSize: '10px' },
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const min = m % 60
  return min > 0 ? `${h}h ${min}m` : `${h}h`
}

function StatCard({ label, value, sub, icon: Icon, color = 'text-white' }: {
  label: string; value: string | number; sub?: string; icon?: React.ElementType; color?: string
}) {
  return (
    <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm flex flex-col gap-1">
      {Icon && (
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 uppercase">
          <Icon className="w-3 h-3" /> {label}
        </div>
      )}
      {!Icon && <div className="text-[10px] font-mono text-gray-500 uppercase">{label}</div>}
      <div className={`text-2xl font-bold tracking-tight ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-500 font-mono">{sub}</div>}
    </div>
  )
}

export default function PlaytimeInsights({ data, players, locale = 'en' }: PlaytimeInsightsProps) {
  const t = translations[locale]
  const [playerRange, setPlayerRange] = useState<PlayerRange>('ALL')

  // Radar: map key retention milestones to engagement axes
  const radarData = useMemo(() => {
    const find = (label: string) => data.retention.find(r => r.threshold === label)?.percentage ?? 0
    return [
      { axis: '10min', value: find('10 minutes') },
      { axis: '30min', value: find('30 minutes') },
      { axis: '1h',    value: find('1 hour 0 minutes') },
      { axis: '2h',    value: find('2 hours 0 minutes') },
      { axis: '5h',    value: find('5 hours 0 minutes') },
      { axis: '10h+',  value: find('10 hours 0 minutes') },
    ]
  }, [data.retention])

  const barData = useMemo(() => {
    const rows = data.retention.map(r => ({
      label: r.threshold.replace(' 0 minutes', '').replace(' minutes', 'm').replace(' hours', 'h').replace(' hour', 'h'),
      percentage: r.percentage,
    }))
    let last = rows.length - 1
    while (last > 0 && rows[last].percentage === 0) last--
    return rows.slice(0, Math.min(last + 2, rows.length))
  }, [data.retention])

  const maxBar = Math.max(...barData.map(d => d.percentage))

  const engagementScore = useMemo(() => {
    const weights = [1, 2, 3, 4, 5, 6]
    let totalW = 0; let totalV = 0
    radarData.forEach((d, i) => { totalW += weights[i]; totalV += d.value * weights[i] })
    return totalW > 0 ? Math.round(totalV / totalW) : 0
  }, [radarData])

  // Player time series filtered
  const playerChartData = useMemo(() => {
    if (!players) return []
    // Merge peak concurrent and daily active by date
    const pcMap = new Map(players.peakConcurrent.map(p => [p.date, p.value]))
    const daMap = new Map(players.dailyActive.map(p => [p.date, p.value]))
    const allDates = Array.from(new Set([...pcMap.keys(), ...daMap.keys()])).sort()
    const merged = allDates.map(date => ({
      date,
      peak: pcMap.get(date) ?? 0,
      dau: daMap.get(date) ?? 0,
    }))
    if (playerRange === 'ALL') return merged
    const count = playerRange === '30D' ? 30 : playerRange === '90D' ? 90 : 180
    return merged.slice(-count)
  }, [players, playerRange])

  return (
    <div className="space-y-4">
      {/* ── SECTION 1: Playtime key stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t.playtimeUsers} value={data.lifetimeUsers.toLocaleString()} icon={Users} />
        <StatCard label={t.playtimeAvg} value={formatMinutes(data.avgMinutes)} sub={`${data.avgMinutes} ${t.playtimeMinutes}`} icon={Clock} />
        <StatCard label={t.playtimeMedian} value={formatMinutes(data.medianMinutes)} sub={`${data.medianMinutes} ${t.playtimeMinutes}`} icon={Clock} color="text-amber-300" />
        <StatCard label="Engagement" value={`${engagementScore}%`} sub="weighted retention avg" icon={Activity} color="text-emerald-400" />
      </div>

      {(data.rangeMinStr || data.rangeMaxStr) && (
        <div className="bg-black/40 border border-white/10 px-4 py-2.5 backdrop-blur-sm">
          <span className="text-[10px] font-mono text-gray-500 uppercase mr-3">{t.playtimeRange}</span>
          <span className="text-sm font-mono text-white">{data.rangeMinStr} — {data.rangeMaxStr}</span>
        </div>
      )}

      {/* ── SECTION 2: Radar + Retention ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-3">{t.playtimeRadar}</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#333" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#555', fontSize: 9, fontFamily: 'monospace' }} tickCount={4} axisLine={false} />
                <Radar name="Retention %" dataKey="value" stroke="#e5e7eb" fill="#e5e7eb" fillOpacity={0.15} strokeWidth={1.5} dot={{ fill: '#e5e7eb', r: 3 }} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, 'Retention']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] font-mono text-gray-500 mt-1">
            {radarData.map(d => (
              <span key={d.axis}>{d.axis}: <span className="text-white">{d.value}%</span></span>
            ))}
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-1">{t.playtimeRetention}</h3>
          <p className="text-[10px] text-gray-600 font-mono mb-3">{t.playtimeRetentionDesc}</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#555" tick={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="label" stroke="#555" tick={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} width={52} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, 'Players']} />
                <Bar dataKey="percentage" radius={[0, 2, 2, 0]}>
                  {barData.map((entry, i) => {
                    const opacity = maxBar > 0 ? 0.3 + (entry.percentage / maxBar) * 0.7 : 0.3
                    return <Cell key={i} fill={`rgba(229,231,235,${opacity.toFixed(2)})`} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: Players stats + history ── */}
      {players && (
        <>
          {/* Players summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label={t.playersCurrentPlayers} value={players.summary.currentPlayers.toLocaleString()} icon={Monitor} color={players.summary.currentPlayers > 0 ? 'text-emerald-400' : 'text-gray-400'} />
            <StatCard label={t.playersLifetimeAvgDAU} value={players.summary.lifetimeAvgDAU.toLocaleString()} sub="daily active users" icon={Users} />
            <StatCard label={t.playersRecentAvgDAU} value={players.summary.recentAvgDAU.toLocaleString()} sub="recent period" icon={Users} />
            <StatCard label={t.playersAvgPeak} value={players.summary.avgPeakConcurrent.toLocaleString()} sub={`max: ${players.summary.maxPeakConcurrent.toLocaleString()}`} icon={Zap} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label={t.playersMaxDAU} value={players.summary.maxDAU.toLocaleString()} sub="all-time high" />
            <StatCard label="Avg DAU" value={players.summary.avgDAU.toLocaleString()} sub="all history" />
            <StatCard label={t.playersAvgSteamDeck} value={players.summary.avgSteamDeck.toLocaleString()} sub={`max: ${players.summary.maxSteamDeck.toLocaleString()}`} />
            <StatCard label="Peak / DAU Ratio" value={players.summary.avgDAU > 0 ? `${((players.summary.avgPeakConcurrent / players.summary.avgDAU) * 100).toFixed(0)}%` : '—'} sub="concurrent density" />
          </div>

          {/* Time series chart */}
          {playerChartData.length > 0 && (
            <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">{t.playersConcurrentHistory}</h3>
                <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-0.5">
                  {(['30D', '90D', '180D', 'ALL'] as PlayerRange[]).map(r => (
                    <button
                      key={r}
                      onClick={() => setPlayerRange(r)}
                      className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-colors ${playerRange === r ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={playerChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                    <XAxis dataKey="date" stroke="#555" tick={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} minTickGap={40} />
                    <YAxis stroke="#555" tick={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.06)' }}
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                      itemStyle={{ fontFamily: 'monospace', fontSize: '11px' }}
                      labelStyle={{ color: '#888', marginBottom: '2px', fontSize: '10px' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '8px' }}
                      formatter={(value) => value === 'peak' ? 'Peak Concurrent' : 'Daily Active Users'}
                    />
                    <Area type="monotone" dataKey="peak" stroke="#38bdf8" strokeWidth={1.5} fill="url(#peakGrad)" dot={false} />
                    <Area type="monotone" dataKey="dau" stroke="#f59e0b" strokeWidth={1.5} fill="url(#dauGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
