import { useState, useMemo } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, Calendar } from 'lucide-react'
import { cn } from '../lib/utils'
import { filterData, aggregateData, type DataPoint, type TimeRange, type Granularity } from '../lib/analytics'

interface SalesAnalysisProps {
  history: DataPoint[]
}

export default function SalesAnalysis({ history }: SalesAnalysisProps) {
  const [range, setRange] = useState<TimeRange>('30D')
  const [granularity, setGranularity] = useState<Granularity>('day')

  const chartData = useMemo(() => {
    const filtered = filterData(history, range)
    return aggregateData(filtered, granularity)
  }, [history, range, granularity])

  return (
    <div className="bg-black/40 border border-white/10 p-6 backdrop-blur-sm min-h-[450px] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5" />
            SALES PERFORMANCE
          </h3>
          <div className="text-xs text-gray-500 font-mono">
            {chartData.length} DATA POINTS
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Range Selector */}
          <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-1">
            {(['7D', '30D', '90D', '1Y', 'ALL'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-3 py-1 text-xs font-mono font-bold rounded transition-colors",
                  range === r ? "bg-white text-black" : "text-gray-400 hover:text-white"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Granularity Selector */}
          <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-1">
            <button
                onClick={() => setGranularity('day')}
                className={cn(
                  "px-3 py-1 text-xs font-mono font-bold rounded transition-colors flex items-center gap-1",
                  granularity === 'day' ? "bg-white text-black" : "text-gray-400 hover:text-white"
                )}
              >
                <Calendar className="w-3 h-3" /> Day
            </button>
            <button
                onClick={() => setGranularity('week')}
                className={cn(
                  "px-3 py-1 text-xs font-mono font-bold rounded transition-colors flex items-center gap-1",
                  granularity === 'week' ? "bg-white text-black" : "text-gray-400 hover:text-white"
                )}
              >
                Week
            </button>
            <button
                onClick={() => setGranularity('month')}
                className={cn(
                  "px-3 py-1 text-xs font-mono font-bold rounded transition-colors flex items-center gap-1",
                  granularity === 'month' ? "bg-white text-black" : "text-gray-400 hover:text-white"
                )}
              >
                Month
            </button>
          </div>
        </div>
      </div>

      <div className="w-full h-[320px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {granularity === 'day' ? (
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fff" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#fff" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis 
                        dataKey="date" 
                        stroke="#666" 
                        tick={{fontSize: 10, fontFamily: 'monospace'}} 
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                    />
                    <YAxis 
                        stroke="#666" 
                        tick={{fontSize: 10, fontFamily: 'monospace'}} 
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px'}}
                        itemStyle={{color: '#fff', fontFamily: 'monospace'}}
                        labelStyle={{color: '#888', marginBottom: '4px', fontSize: '10px'}}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#fff" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        animationDuration={500}
                    />
                </AreaChart>
            ) : (
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis 
                        dataKey="date" 
                        stroke="#666" 
                        tick={{fontSize: 10, fontFamily: 'monospace'}} 
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                    />
                    <YAxis 
                        stroke="#666" 
                        tick={{fontSize: 10, fontFamily: 'monospace'}} 
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px'}}
                        itemStyle={{color: '#fff', fontFamily: 'monospace'}}
                        labelStyle={{color: '#888', marginBottom: '4px', fontSize: '10px'}}
                    />
                    <Bar 
                        dataKey="value" 
                        fill="#fff" 
                        radius={[2, 2, 0, 0]}
                        animationDuration={500}
                    />
                </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 font-mono text-sm border border-dashed border-white/10 rounded">
            NO DATA AVAILABLE FOR SELECTED PERIOD
          </div>
        )}
      </div>
    </div>
  )
}
