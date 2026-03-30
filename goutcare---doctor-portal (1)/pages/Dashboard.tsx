import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ArrowUp, ArrowDown, Droplets, Pill, CheckCircle2, Circle, AlertCircle, TrendingDown } from 'lucide-react';
import { MOCK_URIC_DATA, INITIAL_TASKS } from '../constants';

const Dashboard: React.FC = () => {
  const currentLevel = MOCK_URIC_DATA[MOCK_URIC_DATA.length - 1].value;
  const previousLevel = MOCK_URIC_DATA[MOCK_URIC_DATA.length - 2].value;
  const isImproving = currentLevel < previousLevel;

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Metric: Uric Acid */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-10 -mt-10 opacity-50"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-500 font-medium text-sm">当前血尿酸值</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${currentLevel <= 420 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                {currentLevel <= 420 ? '达标' : '偏高'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-800">{currentLevel}</span>
              <span className="text-sm text-slate-500">μmol/L</span>
            </div>
            <div className={`flex items-center mt-2 text-sm ${isImproving ? 'text-success' : 'text-danger'}`}>
              {isImproving ? <ArrowDown size={16} className="mr-1" /> : <ArrowUp size={16} className="mr-1" />}
              <span>较上月 {Math.abs(currentLevel - previousLevel)}</span>
            </div>
          </div>
        </div>

        {/* AI Insight Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-primary-600 p-6 rounded-2xl shadow-lg shadow-primary-500/20 text-white relative">
          <div className="flex items-center gap-2 mb-3 opacity-90">
            <div className="p-1 bg-white/20 rounded-lg">
              <AlertCircle size={16} className="text-white" />
            </div>
            <span className="text-sm font-medium">AI 智能预警</span>
          </div>
          <p className="text-lg font-medium leading-relaxed mb-4">
            近期饮食嘌呤摄入控制良好，发作风险较低。
          </p>
          <button className="bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm w-full text-left flex items-center justify-between group">
            查看详细分析
            <span className="transform group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

        {/* Quick Action / Next Pill */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-500 font-medium text-sm">下一次服药</h3>
            <Pill className="text-primary-500" size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">20:00</div>
            <p className="text-slate-500 text-sm">非布司他 (40mg)</p>
          </div>
          <button className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-medium transition-colors">
            标记为已服
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">血尿酸趋势</h3>
            <div className="flex gap-2">
              <select className="bg-slate-50 border-none text-sm text-slate-600 rounded-lg px-3 py-1 outline-none">
                <option>近 6 个月</option>
                <option>近 1 年</option>
              </select>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_URIC_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <ReferenceLine y={420} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '达标上限 420', fill: '#ef4444', fontSize: 10, position: 'right' }} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Tasks */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">今日任务</h3>
          <div className="space-y-4">
            {INITIAL_TASKS.map((task) => (
              <div key={task.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group">
                <div className={`p-2 rounded-full ${task.completed ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-400'}`}>
                  {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {task.title}
                  </h4>
                  {task.target && <p className="text-xs text-slate-500">目标: {task.target}</p>}
                </div>
                {task.icon === 'water' && <Droplets size={16} className="text-blue-400" />}
                {task.icon === 'pill' && <Pill size={16} className="text-indigo-400" />}
                {task.icon === 'food' && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 border border-dashed border-slate-300 text-slate-500 rounded-lg text-sm hover:border-primary-500 hover:text-primary-600 transition-colors">
            + 添加自定义打卡
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
