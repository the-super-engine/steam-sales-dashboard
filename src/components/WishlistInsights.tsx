import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Heart } from 'lucide-react'

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
  locale?: 'en' | 'zh-CN'
  currentOutstanding?: number | null
}

export default function WishlistInsights({ history, locale = 'en', currentOutstanding = null }: WishlistInsightsProps) {
  const copy = locale === 'zh-CN'
    ? {
        flow: '愿望单流入流出',
        momentum: '净变化动量',
        weekly: '每周新增分布',
        trend: '待实现愿望单趋势',
        currentOutstanding: '当前待实现愿望单',
        totalAdditions: '总新增',
        totalOutflow: '总流失',
        netChange: '净变化'
      }
    : {
        flow: 'WISHLIST FLOW',
        momentum: 'Net Wishlist Momentum',
        weekly: 'Weekly Additions Pattern',
        trend: 'Outstanding Wishlist Trend',
        currentOutstanding: 'Current Outstanding',
        totalAdditions: 'Total Additions',
        totalOutflow: 'Total Outflow',
        netChange: 'Net Change'
      }
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
        acc.net += row.net
        return acc
      },
      { additions: 0, outflow: 0, net: 0 }
    )
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
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
              Adds ≥{v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 border border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="text-xs text-gray-500 font-mono uppercase mb-1">{copy.currentOutstanding}</div>
          <div className="text-2xl font-bold">{currentOutstandingValue.toLocaleString()}</div>
        </div>
        <div className="p-4 border border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="text-xs text-gray-500 font-mono uppercase mb-1">{copy.totalAdditions}</div>
          <div className="text-2xl font-bold text-emerald-300">{totals.additions.toLocaleString()}</div>
        </div>
        <div className="p-4 border border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="text-xs text-gray-500 font-mono uppercase mb-1">{copy.totalOutflow}</div>
          <div className="text-2xl font-bold text-rose-300">{totals.outflow.toLocaleString()}</div>
        </div>
        <div className="p-4 border border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="text-xs text-gray-500 font-mono uppercase mb-1">{copy.netChange}</div>
          <div className={`text-2xl font-bold ${totals.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {totals.net >= 0 ? '+' : ''}{totals.net.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="bg-black/40 border border-white/10 p-6 backdrop-blur-sm">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
          <Heart className="w-5 h-5" />
          {copy.flow}
        </h3>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} minTickGap={30} />
              <YAxis stroke="#666" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
                labelStyle={{ color: '#888', marginBottom: '4px', fontSize: '10px' }}
              />
              <Bar dataKey="additions" fill="#34d399" radius={[2, 2, 0, 0]} />
              <Bar dataKey="outflow" fill="#fb7185" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-black/40 border border-white/10 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold mb-6">{copy.momentum}</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis stroke="#666" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                  itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
                  labelStyle={{ color: '#888', marginBottom: '4px', fontSize: '10px' }}
                />
                <Line type="monotone" dataKey="net" stroke="#f3f4f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold mb-6">{copy.weekly}</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="label" stroke="#666" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                  itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
                  labelStyle={{ color: '#888', marginBottom: '4px', fontSize: '10px' }}
                />
                <Bar dataKey="additions" fill="#d4d4d8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-black/40 border border-white/10 p-6 backdrop-blur-sm">
        <h3 className="text-lg font-bold mb-6">{copy.trend}</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="wishlistBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c084fc" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} minTickGap={30} />
              <YAxis stroke="#666" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
                labelStyle={{ color: '#888', marginBottom: '4px', fontSize: '10px' }}
              />
              <Area type="monotone" dataKey="balance" stroke="#c084fc" strokeWidth={2} fillOpacity={1} fill="url(#wishlistBalance)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
