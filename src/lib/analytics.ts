import { startOfWeek, startOfMonth, format, subDays } from 'date-fns'

export interface DataPoint {
  date: string
  value: number
}

export type TimeRange = '7D' | '30D' | '90D' | '1Y' | 'ALL' | 'CUSTOM'
export type Granularity = 'day' | 'week' | 'month'

export function filterData(data: DataPoint[], range: TimeRange, customRange?: { from?: Date, to?: Date }): DataPoint[] {
  if (!data || !Array.isArray(data) || data.length === 0) return []
  if (range === 'ALL') return data

  const now = new Date()
  let cutoffDate = new Date()

  if (range === 'CUSTOM') {
    if (!customRange?.from || !customRange?.to) return data // Return all if incomplete
    const from = new Date(customRange.from)
    const to = new Date(customRange.to)
    // Set to end of day
    to.setHours(23, 59, 59, 999)
    
    return data.filter(d => {
      const date = new Date(d.date)
      return !isNaN(date.getTime()) && date >= from && date <= to
    })
  }

  switch (range) {
    case '7D':
      cutoffDate = subDays(now, 7)
      break
    case '30D':
      cutoffDate = subDays(now, 30)
      break
    case '90D':
      cutoffDate = subDays(now, 90)
      break
    case '1Y':
      cutoffDate = subDays(now, 365)
      break
  }

  return data.filter(d => {
    const date = new Date(d.date)
    return !isNaN(date.getTime()) && date >= cutoffDate
  })
}

export function aggregateData(data: DataPoint[], granularity: Granularity): DataPoint[] {
  if (!data || data.length === 0) return []

  const aggregated: Record<string, number> = {}

  data.forEach(point => {
    const date = new Date(point.date)
    // Validate date
    if (isNaN(date.getTime())) return

    let key = format(date, 'yyyy-MM-dd')
    const value = Number(point.value) || 0

    try {
      if (granularity === 'week') {
        key = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      } else if (granularity === 'month') {
        key = format(startOfMonth(date), 'yyyy-MM-dd')
      }
    
      aggregated[key] = (aggregated[key] || 0) + value
    } catch (e) {
      console.warn('Date aggregation failed for:', point.date, e)
    }
  })

  return Object.entries(aggregated)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function calculateKeyStats(data: DataPoint[]) {
  if (!data || !Array.isArray(data) || data.length === 0) return null

  const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0)
  const avg = total / data.length
  
  // Best day
  const bestDay = [...data].sort((a, b) => (b.value || 0) - (a.value || 0))[0]
  
  // Growth Trend (Last 7 days vs Previous 7 days)
  // Need to sort by date descending first
  const sorted = [...data]
    .filter(d => !isNaN(new Date(d.date).getTime()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  const last7 = sorted.slice(0, 7).reduce((acc, curr) => acc + (curr.value || 0), 0)
  const prev7 = sorted.slice(7, 14).reduce((acc, curr) => acc + (curr.value || 0), 0)
  
  const growth = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : 0

  return {
    total,
    average: Math.round(avg),
    bestDay: bestDay || { date: 'N/A', value: 0 },
    growth: Math.round(growth)
  }
}

export function getDayOfWeekStats(data: DataPoint[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const counts = new Array(7).fill(0)
  
  if (!data || !Array.isArray(data)) return days.map(day => ({ day, value: 0 }))

  data.forEach(point => {
    const date = new Date(point.date)
    if (!isNaN(date.getTime())) {
        const dayIndex = date.getDay()
        counts[dayIndex] += (point.value || 0)
    }
  })
  
  return days.map((day, i) => ({ day, value: counts[i] }))
}

export function getPeriodStats(data: DataPoint[]) {
  if (!data || data.length === 0) return null
  const sorted = [...data]
    .filter(d => !isNaN(new Date(d.date).getTime()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const sum = (arr: DataPoint[]) => arr.reduce((a, b) => a + (b.value || 0), 0)
  const last30 = sum(sorted.slice(0, 30))
  const prev30 = sum(sorted.slice(30, 60))
  const last90 = sum(sorted.slice(0, 90))
  const prev90 = sum(sorted.slice(90, 180))
  const change30 = prev30 > 0 ? Math.round(((last30 - prev30) / prev30) * 100) : 0
  const change90 = prev90 > 0 ? Math.round(((last90 - prev90) / prev90) * 100) : 0
  const activeDays = data.filter(d => (d.value || 0) > 0).length
  const vals = [...data].map(d => d.value || 0).sort((a, b) => a - b)
  const median = vals[Math.floor(vals.length / 2)] || 0
  const monthMap = new Map<string, number>()
  for (const point of data) {
    const month = point.date.slice(0, 7)
    monthMap.set(month, (monthMap.get(month) || 0) + (point.value || 0))
  }
  const bestMonthEntry = [...monthMap.entries()].sort((a, b) => b[1] - a[1])[0]
  const bestMonth = bestMonthEntry ? { month: bestMonthEntry[0], value: bestMonthEntry[1] } : null
  // 30D avg vs 90D avg to detect acceleration
  const avg30 = last30 / 30
  const avg90 = last90 / 90
  const velocity = avg90 > 0 ? Math.round(((avg30 - avg90) / avg90) * 100) : 0
  return { last30, prev30, change30, last90, prev90, change90, activeDays, median, bestMonth, velocity }
}

export function getCumulativeData(data: DataPoint[]) {
  if (!data || data.length === 0) return []
  const sorted = [...data]
    .filter(d => !isNaN(new Date(d.date).getTime()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  let cumulative = 0
  return sorted.map(point => {
    cumulative += point.value || 0
    return { date: point.date, value: point.value || 0, cumulative }
  })
}
