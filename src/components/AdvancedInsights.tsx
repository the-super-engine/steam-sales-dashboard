import { useMemo, useState } from 'react'
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, SlidersHorizontal } from 'lucide-react'
import { addDays, eachDayOfInterval, endOfYear, format, getDay, parseISO, startOfYear, subDays } from 'date-fns'
import { cn } from '../lib/utils'

type DataPoint = { date: string; value: number }

interface AdvancedInsightsProps {
  history: DataPoint[]
  locale?: 'en' | 'zh-CN'
}

type RangePreset = '90D' | '180D' | '365D'

function normalizeHistory(history: DataPoint[]) {
  const map = new Map<string, number>()
  for (const point of history) {
    const date = parseISO(point.date)
    if (Number.isNaN(date.getTime())) continue
    const key = format(date, 'yyyy-MM-dd')
    map.set(key, (map.get(key) || 0) + (Number(point.value) || 0))
  }
  return map
}

function getHeatColor(value: number, max: number) {
  if (value <= 0) return 'bg-white/5'
  const ratio = max > 0 ? value / max : 0
  if (ratio < 0.2) return 'bg-zinc-800'
  if (ratio < 0.4) return 'bg-zinc-700'
  if (ratio < 0.6) return 'bg-zinc-500'
  if (ratio < 0.8) return 'bg-zinc-300'
  return 'bg-white'
}

export default function AdvancedInsights({ history, locale = 'en' }: AdvancedInsightsProps) {
  const [yearFilter, setYearFilter] = useState<'ALL' | string>('ALL')
  const [rangePreset, setRangePreset] = useState<RangePreset>('365D')
  const [minUnits, setMinUnits] = useState(0)
  const [hovered, setHovered] = useState<{ date: string; value: number; x: number; y: number } | null>(null)
  const copy = locale === 'zh-CN'
    ? {
        heatmapTitle: '每日销量热力图',
        heatmapDesc: '按日期展示每日销量强度',
        hoverHint: '悬浮查看当日销量',
        unitsLabel: '销量',
        monthly: '月度销量',
        weekday: '周内表现',
        allYears: '全部年份'
      }
    : {
        heatmapTitle: 'DAILY SALES HEATMAP',
        heatmapDesc: 'Daily units sold intensity by date',
        hoverHint: 'Hover a cell to inspect daily units',
        unitsLabel: 'units',
        monthly: 'Monthly Volume',
        weekday: 'Weekday Performance',
        allYears: 'ALL YEARS'
      }

  const normalizedMap = useMemo(() => normalizeHistory(history), [history])

  const allDates = useMemo(() => {
    return Array.from(normalizedMap.keys()).sort()
  }, [normalizedMap])

  const years = useMemo(() => {
    const set = new Set<string>()
    for (const d of allDates) set.add(d.slice(0, 4))
    return Array.from(set).sort((a, b) => Number(b) - Number(a))
  }, [allDates])

  const heatmapDays = useMemo(() => {
    if (allDates.length === 0) return []
    const latest = parseISO(allDates[allDates.length - 1])
    if (yearFilter === 'ALL') {
      const dayCount = rangePreset === '90D' ? 90 : rangePreset === '180D' ? 180 : 365
      const start = subDays(latest, dayCount - 1)
      return eachDayOfInterval({ start, end: latest })
    }
    const start = startOfYear(new Date(Number(yearFilter), 0, 1))
    const end = endOfYear(start)
    return eachDayOfInterval({ start, end })
  }, [allDates, yearFilter, rangePreset])

  const heatCells = useMemo(() => {
    return heatmapDays.map(d => {
      const key = format(d, 'yyyy-MM-dd')
      const value = normalizedMap.get(key) || 0
      return { key, value, weekday: getDay(d) }
    })
  }, [heatmapDays, normalizedMap])

  const maxHeatValue = useMemo(() => {
    return heatCells.reduce((m, c) => Math.max(m, c.value), 0)
  }, [heatCells])

  const monthBars = useMemo(() => {
    const monthMap = new Map<string, number>()
    for (const cell of heatCells) {
      if (cell.value < minUnits) continue
      const monthKey = cell.key.slice(0, 7)
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + cell.value)
    }
    return Array.from(monthMap.entries())
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [heatCells, minUnits])

  const weekdayBars = useMemo(() => {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const buckets = [0, 0, 0, 0, 0, 0, 0]
    for (const cell of heatCells) {
      if (cell.value < minUnits) continue
      buckets[cell.weekday] += cell.value
    }
    return labels.map((label, i) => ({ label, value: buckets[i] }))
  }, [heatCells, minUnits])

  const weekColumns = useMemo(() => {
    if (heatmapDays.length === 0) return []
    const first = heatmapDays[0]
    const offset = getDay(first)
    const paddedStart = subDays(first, offset)
    const paddedEnd = addDays(heatmapDays[heatmapDays.length - 1], 6 - getDay(heatmapDays[heatmapDays.length - 1]))
    const fullRange = eachDayOfInterval({ start: paddedStart, end: paddedEnd })
    const columns: Array<Array<{ key: string; value: number }>> = []
    for (let i = 0; i < fullRange.length; i += 7) {
      const week = fullRange.slice(i, i + 7).map(d => {
        const key = format(d, 'yyyy-MM-dd')
        return { key, value: normalizedMap.get(key) || 0 }
      })
      columns.push(week)
    }
    return columns
  }, [heatmapDays, normalizedMap])

  return (
    <div className="space-y-8">
      <div className="bg-black/40 border border-white/10 p-6 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              {copy.heatmapTitle}
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-1">{copy.heatmapDesc}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-1">
              <SlidersHorizontal className="w-3 h-3 text-gray-400 mx-2" />
              <select
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
                className="bg-transparent text-xs font-mono text-white outline-none"
              >
                <option value="ALL" className="bg-black">{copy.allYears}</option>
                {years.map(y => <option key={y} value={y} className="bg-black">{y}</option>)}
              </select>
            </div>
            <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-1">
              {(['90D', '180D', '365D'] as RangePreset[]).map(preset => (
                <button
                  key={preset}
                  onClick={() => setRangePreset(preset)}
                  className={cn(
                    'px-3 py-1 text-xs font-mono font-bold rounded transition-colors',
                    yearFilter === 'ALL' && rangePreset === preset ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-1">
              {[0, 1, 5, 10].map(v => (
                <button
                  key={v}
                  onClick={() => setMinUnits(v)}
                  className={cn(
                    'px-3 py-1 text-xs font-mono font-bold rounded transition-colors',
                    minUnits === v ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
                  )}
                >
                  ≥{v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-flex gap-1 min-w-full pb-2">
            {weekColumns.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map(day => (
                  <div
                    key={day.key}
                    className={cn('w-3.5 h-3.5 rounded-[2px] border border-white/5', getHeatColor(day.value < minUnits ? 0 : day.value, maxHeatValue))}
                    onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setHovered({ 
                            date: day.key, 
                            value: day.value, 
                            x: rect.left + rect.width / 2, 
                            y: rect.top 
                        })
                    }}
                    onMouseLeave={() => setHovered(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        
        {/* Custom Tooltip */}
        {hovered && (
            <div 
                className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full px-3 py-2 bg-zinc-900 border border-white/10 rounded shadow-xl text-xs font-mono text-white transition-opacity duration-75"
                style={{ left: hovered.x, top: hovered.y - 8 }}
            >
                <div className="font-bold text-gray-400 mb-1">{hovered.date}</div>
                <div className="text-lg font-bold text-white leading-none">
                    {hovered.value.toLocaleString()} 
                    <span className="text-gray-500 text-[10px] ml-1 font-normal uppercase">{copy.unitsLabel}</span>
                </div>
            </div>
        )}

        <div className="flex items-center justify-end gap-2 text-[10px] font-mono text-gray-500 mt-3">
          <span>LOW</span>
          <span className="w-3 h-3 rounded-[2px] bg-white/5 border border-white/10" />
          <span className="w-3 h-3 rounded-[2px] bg-zinc-800 border border-white/10" />
          <span className="w-3 h-3 rounded-[2px] bg-zinc-700 border border-white/10" />
          <span className="w-3 h-3 rounded-[2px] bg-zinc-500 border border-white/10" />
          <span className="w-3 h-3 rounded-[2px] bg-white border border-white/10" />
          <span>HIGH</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-black/40 border border-white/10 p-6 backdrop-blur-sm">
          <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">{copy.monthly}</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="month" stroke="#666" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                  itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
                  labelStyle={{ color: '#888', marginBottom: '4px', fontSize: '10px' }}
                />
                <Bar dataKey="value" fill="#fff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 p-6 backdrop-blur-sm">
          <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">{copy.weekday}</h4>
          <div className="h-[260px]">
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
                <Bar dataKey="value" fill="#9ca3af" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
