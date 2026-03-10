import { useMemo } from 'react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid } from 'recharts'
import { TrendingUp, Calendar, Award, Zap, BarChart2 } from 'lucide-react'
import CountUp from 'react-countup'
import { type DataPoint, calculateKeyStats, getDayOfWeekStats, getPeriodStats, getCumulativeData } from '../lib/analytics'
import { translations, type Locale } from '../lib/locales'

interface ExtendedMetricsProps {
  history: DataPoint[]
  locale?: Locale
}

const tooltipStyle = {
  cursor: { fill: 'rgba(255,255,255,0.08)' },
  contentStyle: { backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' },
  itemStyle: { color: '#fff', fontFamily: 'monospace', fontSize: '11px' },
  labelStyle: { color: '#888', marginBottom: '2px', fontSize: '10px' },
}

function Chip({ value, positive = value >= 0 }: { value: number; positive?: boolean }) {
  return (
    <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${positive ? 'text-emerald-400 bg-emerald-900/30' : 'text-rose-400 bg-rose-900/30'}`}>
      {value >= 0 ? '+' : ''}{value}%
    </span>
  )
}

export default function ExtendedMetrics({ history, locale = 'en' }: ExtendedMetricsProps) {
  const t = translations[locale]
  const stats = useMemo(() => calculateKeyStats(history), [history])
  const period = useMemo(() => getPeriodStats(history), [history])
  const dayOfWeekData = useMemo(() => getDayOfWeekStats(history), [history])
  const cumulativeData = useMemo(() => getCumulativeData(history), [history])

  const maxDayValue = Math.max(...dayOfWeekData.map(d => d.value))

  if (!stats || !period) return null

  return (
    <div className="space-y-4">
      {/* Row 1: Key stats + period comparison */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Best day */}
        <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 uppercase">
            <Award className="w-3 h-3" /> {t.emBestDay}
          </div>
          <div className="text-xs text-gray-400 font-mono">{stats.bestDay.date}</div>
          <div className="text-2xl font-bold text-white tracking-tight">
            <CountUp end={stats.bestDay.value} separator="," />
          </div>
          <div className="text-[10px] text-gray-500 font-mono">{t.emUnitsSold}</div>
        </div>

        {/* 7D Growth */}
        <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 uppercase">
            <TrendingUp className="w-3 h-3" /> {t.em7dGrowth}
          </div>
          <div className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${stats.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.growth >= 0 ? '+' : ''}{stats.growth}%
          </div>
          <div className="text-[10px] text-gray-500 font-mono">{t.emVsPrev7}</div>
        </div>

        {/* Active days */}
        <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 uppercase">
            <Calendar className="w-3 h-3" /> {t.emActiveDays}
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            <CountUp end={period.activeDays} />
          </div>
          <div className="text-[10px] text-gray-500 font-mono">{t.emOfTracked.replace('{n}', history.length.toString())}</div>
        </div>

        {/* Velocity */}
        <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 uppercase">
            <Zap className="w-3 h-3" /> {t.emVelocity}
          </div>
          <div className={`text-2xl font-bold tracking-tight ${period.velocity >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {period.velocity >= 0 ? '+' : ''}{period.velocity}%
          </div>
          <div className="text-[10px] text-gray-500 font-mono">{t.emVelocityDesc}</div>
        </div>
      </div>

      {/* Row 2: Period comparison + median + best month */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono text-gray-500 uppercase">{t.emLast30D}</div>
            <Chip value={period.change30} />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            <CountUp end={period.last30} separator="," />
          </div>
          <div className="text-[10px] text-gray-500 font-mono">{t.emPrev}: {period.prev30.toLocaleString()}</div>
        </div>

        <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono text-gray-500 uppercase">{t.emLast90D}</div>
            <Chip value={period.change90} />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            <CountUp end={period.last90} separator="," />
          </div>
          <div className="text-[10px] text-gray-500 font-mono">{t.emPrev}: {period.prev90.toLocaleString()}</div>
        </div>

        <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm flex flex-col gap-1">
          <div className="text-[10px] font-mono text-gray-500 uppercase mb-1">{t.emAvgMedian}</div>
          <div className="text-2xl font-bold text-white tracking-tight">
            <CountUp end={stats.average} separator="," />
          </div>
          <div className="text-[10px] text-gray-500 font-mono">{t.emMedian}: {period.median.toLocaleString()}</div>
        </div>

        <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm flex flex-col gap-1">
          <div className="text-[10px] font-mono text-gray-500 uppercase mb-1">{t.emBestMonth}</div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {period.bestMonth ? <CountUp end={period.bestMonth.value} separator="," /> : '—'}
          </div>
          <div className="text-[10px] text-gray-500 font-mono">{period.bestMonth?.month ?? '—'}</div>
        </div>
      </div>

      {/* Row 3: Cumulative + DoW charts side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Cumulative growth curve */}
        <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1.5">
            <BarChart2 className="w-3 h-3" /> {t.emCumulative}
          </h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="cumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e5e7eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#e5e7eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                <XAxis dataKey="date" stroke="#555" tick={{ fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} minTickGap={40} />
                <Tooltip {...tooltipStyle} formatter={(v) => [Number(v).toLocaleString(), 'Cumulative']} />
                <Area type="monotone" dataKey="cumulative" stroke="#e5e7eb" strokeWidth={1.5} fill="url(#cumGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Day of week */}
        <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-sm">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" /> {t.emWeeklyPattern}
          </h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekData}>
                <XAxis dataKey="day" stroke="#555" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {dayOfWeekData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value === maxDayValue ? '#fff' : '#2a2a2a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
