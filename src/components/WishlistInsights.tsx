import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'
import { Heart, TrendingUp, ShoppingCart, Trash2, Gift } from 'lucide-react'
import { translations, type Locale } from '../lib/locales'

type WishlistPoint = {
  date: string
  additions: number
  deletions: number
  purchases: number
  gifts: number
  balance: number
  net: number
}

interface WishlistInsightsProps {
  history: WishlistPoint[]
  locale?: Locale
  currentOutstanding?: number | null
}

const tooltipStyle = {
  cursor: { fill: 'rgba(255,255,255,0.08)' },
  contentStyle: { backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' },
  itemStyle: { color: '#fff', fontFamily: 'monospace', fontSize: '11px' },
  labelStyle: { color: '#888', marginBottom: '2px', fontSize: '10px' },
}

export default function WishlistInsights({ history, locale = 'en', currentOutstanding = null }: WishlistInsightsProps) {
  const t = translations[locale]
  const [range, setRange] = useState<'30D' | '90D' | '180D' | 'ALL'>('90D')
  const [minDailyAdds, setMinDailyAdds] = useState(0)

  const chartData = useMemo(() => {
    const sorted = [...history]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        date: item.date,
        additions: item.additions,
        outflow: Math.abs(item.deletions) + Math.abs(item.purchases) + Math.abs(item.gifts),
        balance: item.balance,
        net: item.net,
        purchases: Math.abs(item.purchases),
        deletions: Math.abs(item.deletions),
        gifts: Math.abs(item.gifts)
      }))
    const filteredByAdds = sorted.filter(d => d.additions >= minDailyAdds)
    if (range === 'ALL') return filteredByAdds
    const count = range === '30D' ? 30 : range === '90D' ? 90 : 180
    return filteredByAdds.slice(-count)
  }, [history, minDailyAdds, range])

  const latest = chartData[chartData.length - 1]
  const currentOutstandingValue = currentOutstanding ?? latest?.balance ?? 0

  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, row) => {
        acc.additions += row.additions
        acc.outflow += row.outflow
        acc.purchases += row.purchases
        acc.deletions += row.deletions
        acc.gifts += row.gifts
        acc.net += row.net
        return acc
      },
      { additions: 0, outflow: 0, purchases: 0, deletions: 0, gifts: 0, net: 0 }
    )
  }, [chartData])

  // Conversion rate: purchases / total additions (as %)
  const conversionRate = totals.additions > 0 ? ((totals.purchases / totals.additions) * 100).toFixed(1) : '0.0'

  // Outflow breakdown for bar chart
  const outflowBreakdown = [
    { label: 'Purchases', value: totals.purchases, color: '#34d399' },
    { label: 'Deletions', value: totals.deletions, color: '#fb7185' },
    { label: 'Gifts', value: totals.gifts, color: '#a78bfa' },
  ]

  // Recent momentum: last 30 adds vs prev 30 adds
  const recentMomentum = useMemo(() => {
    const last30 = chartData.slice(-30).reduce((a, b) => a + b.additions, 0)
    const prev30 = chartData.slice(-60, -30).reduce((a, b) => a + b.additions, 0)
    if (prev30 === 0) return 0
    return Math.round(((last30 - prev30) / prev30) * 100)
  }, [chartData])

  const weekdayBars = useMemo(() => {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const buckets = [0, 0, 0, 0, 0, 0, 0]
    for (const row of chartData) {
      const day = new Date(row.date).getDay()
      buckets[day] += row.additions
    }
    return labels.map((label, i) => ({ label, additions: buckets[i] }))
  }, [chartData])

  const maxWeekdayVal = Math.max(...weekdayBars.map(d => d.additions))

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-1">
          {(['30D', '90D', '180D', 'ALL'] as const).map(v => (
            <button
              key={v}
              onClick={() => setRange(v)}
              className={`px-3 py-1 text-xs font-mono font-bold rounded transition-colors ${range === v ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-1">
          {[0, 10, 50, 100].map(v => (
            <button
              key={v}
              onClick={() => setMinDailyAdds(v)}
              className={`px-3 py-1 text-xs font-mono font-bold rounded transition-colors ${minDailyAdds === v ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
            >
              ≥{v}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Key stats - 6 compact cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 border border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">{t.currentOutstanding}</div>
          <div className="text-xl font-bold">{currentOutstandingValue.toLocaleString()}</div>
        </div>
        <div className="p-3 border border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">{t.totalAdditions}</div>
          <div className="text-xl font-bold text-emerald-300">{totals.additions.toLocaleString()}</div>
        </div>
        <div className="p-3 border border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">{t.totalOutflow}</div>
          <div className="text-xl font-bold text-rose-300">{totals.outflow.toLocaleString()}</div>
        </div>
        <div className="p-3 border border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">{t.netChange}</div>
          <div className={`text-xl font-bold ${totals.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {totals.net >= 0 ? '+' : ''}{totals.net.toLocaleString()}
          </div>
        </div>
        {/* Conversion rate */}
        <div className="p-3 border border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono uppercase mb-1">
            <ShoppingCart className="w-3 h-3" /> Conv. Rate
          </div>
          <div className="text-xl font-bold text-amber-300">{conversionRate}%</div>
          <div className="text-[10px] text-gray-500 font-mono">{totals.purchases.toLocaleString()} purchases</div>
        </div>
        {/* Momentum */}
        <div className="p-3 border border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono uppercase mb-1">
            <TrendingUp className="w-3 h-3" /> Momentum
          </div>
          <div className={`text-xl font-bold ${recentMomentum >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {recentMomentum >= 0 ? '+' : ''}{recentMomentum}%
          </div>
          <div className="text-[10px] text-gray-500 font-mono">30D adds vs prev</div>
        </div>
      </div>

      {/* Row 2: Main flow chart */}
      <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm">
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1.5">
          <Heart className="w-3 h-3" /> {t.wishlistFlow}
        </h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
              <XAxis dataKey="date" stroke="#555" tick={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} minTickGap={30} />
              <YAxis stroke="#555" tick={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="additions" fill="#34d399" radius={[2, 2, 0, 0]} />
              <Bar dataKey="outflow" fill="#fb7185" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: 3-column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Momentum line */}
        <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-3">{t.wishlistMomentum}</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                <XAxis dataKey="date" stroke="#555" tick={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis stroke="#555" tick={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="net" stroke="#f3f4f6" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outflow breakdown */}
        <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-3">Outflow Breakdown</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outflowBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
                <XAxis type="number" stroke="#555" tick={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="label" stroke="#555" tick={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} width={60} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                  {outflowBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-mono text-gray-500">
            <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3 text-emerald-400" /> {((totals.purchases / (totals.outflow || 1)) * 100).toFixed(0)}% buy</span>
            <span className="flex items-center gap-1"><Trash2 className="w-3 h-3 text-rose-400" /> {((totals.deletions / (totals.outflow || 1)) * 100).toFixed(0)}% del</span>
            <span className="flex items-center gap-1"><Gift className="w-3 h-3 text-violet-400" /> {((totals.gifts / (totals.outflow || 1)) * 100).toFixed(0)}% gift</span>
          </div>
        </div>

        {/* Weekday pattern */}
        <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-3">{t.weeklyPattern}</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                <XAxis dataKey="label" stroke="#555" tick={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <YAxis stroke="#555" tick={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="additions" radius={[2, 2, 0, 0]}>
                  {weekdayBars.map((entry, i) => (
                    <Cell key={i} fill={entry.additions === maxWeekdayVal ? '#34d399' : '#2a2a2a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Balance trend */}
      <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm">
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-3">{t.wishlistTrend}</h3>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="wishlistBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
              <XAxis dataKey="date" stroke="#555" tick={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} minTickGap={30} />
              <YAxis stroke="#555" tick={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="balance" stroke="#c084fc" strokeWidth={1.5} fillOpacity={1} fill="url(#wishlistBalance)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
