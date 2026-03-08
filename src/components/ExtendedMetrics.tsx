import { useMemo } from 'react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, Calendar, Award } from 'lucide-react'
import CountUp from 'react-countup'
import { type DataPoint, calculateKeyStats, getDayOfWeekStats } from '../lib/analytics'

interface ExtendedMetricsProps {
  history: DataPoint[]
}

export default function ExtendedMetrics({ history }: ExtendedMetricsProps) {
  const stats = useMemo(() => calculateKeyStats(history), [history])
  const dayOfWeekData = useMemo(() => getDayOfWeekStats(history), [history])

  // Find max value for day of week to highlight
  const maxDayValue = Math.max(...dayOfWeekData.map(d => d.value))

  if (!stats) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
      
      {/* Key Statistics Card */}
      <div className="bg-black/40 border border-white/10 p-6 backdrop-blur-sm flex flex-col justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
          <Award className="w-4 h-4" /> Performance Highlights
        </h3>
        
        <div className="space-y-6">
          <div>
            <div className="text-xs text-gray-500 font-mono mb-1">BEST SALES DAY</div>
            <div className="text-xl font-bold text-white mb-1">
              {stats.bestDay.date}
            </div>
            <div className="text-3xl font-bold text-white tracking-tighter">
              <CountUp end={stats.bestDay.value} separator="," /> <span className="text-sm text-gray-500 font-normal">units</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div>
              <div className="text-xs text-gray-500 font-mono mb-1">AVG DAILY UNITS</div>
              <div className="text-2xl font-bold text-white">
                <CountUp end={stats.average} separator="," />
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 font-mono mb-1">TOTAL TRACKED</div>
              <div className="text-2xl font-bold text-white">
                <CountUp end={stats.total} separator="," />
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/10">
             <div className="text-xs text-gray-500 font-mono mb-1">RECENT GROWTH (7D vs 7D)</div>
             <div className={`text-2xl font-bold ${stats.growth >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center gap-2`}>
                {stats.growth >= 0 ? '+' : ''}{stats.growth}%
                <TrendingUp className={`w-5 h-5 ${stats.growth < 0 ? 'rotate-180' : ''}`} />
             </div>
          </div>
        </div>
      </div>

      {/* Day of Week Analysis */}
      <div className="bg-black/40 border border-white/10 p-6 backdrop-blur-sm md:col-span-2 flex flex-col">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Weekly Sales Pattern
        </h3>
        
        <div className="flex-1 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayOfWeekData}>
              <XAxis 
                dataKey="day" 
                stroke="#666" 
                tick={{fontSize: 12, fontFamily: 'monospace'}} 
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                contentStyle={{backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px'}}
                itemStyle={{color: '#fff', fontFamily: 'monospace'}}
                labelStyle={{color: '#888', marginBottom: '4px', fontSize: '10px'}}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {dayOfWeekData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.value === maxDayValue ? '#fff' : '#333'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center text-xs text-gray-500 font-mono">
           Based on all available historical data
        </div>
      </div>

    </div>
  )
}
