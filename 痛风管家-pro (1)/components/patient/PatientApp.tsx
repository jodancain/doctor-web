
import React, { useState } from 'react';
import { 
  Home, FileText, Activity, MessageCircle, User, 
  Plus, Droplets, Utensils, Pill, ChevronRight, 
  TrendingUp, AlertCircle, Search, ArrowLeft,
  CheckCircle, Zap, BookOpen, Gift, Trophy,
  Clock, Calendar as CalendarIcon, Send, Camera,
  Bell, Lock, Clipboard, Stethoscope, Microscope, Image as ImageIcon,
  Folder, FileClock, Dna, Users as UsersIcon, FlaskConical, ClipboardCheck, FileHeart, UserCheck, Accessibility, LayoutGrid,
  ChevronDown, Flame, Eye, BarChart2, Coffee, GlassWater, Wine,
  Edit2,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Leaf,
  Save,
  X
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, ReferenceLine, BarChart, Bar, Legend
} from 'recharts';
import { 
  AppContainer, ScrollArea, BottomNav, Card, StatCard, 
  SectionHeader, Button, Chip, AppHeader, SegmentedControl, 
  ProgressBar, PainSlider 
} from '../ui/Common';
import { generateHealthAdvice } from '../../services/ai';
import { Task, WaterLog, Medication, AttackRecord } from '../../types';
import { 
  getRecords, getMedicalFolderProfile, initMedicalFolder, updateMedicalFolderSection, MedicalFolderProfile,
  getUALogs, addUALog, UricAcidLog, getArticles, Article, addAttackRecord, getAttackRecords,
  getTodayWater, addWater, WaterDaily, WaterRecord,
  getDietLogs, addDietLog, getFoodDatabase, FoodDatabaseItem, DietLogEntry
} from '../../services/store';

// --- Mock Data ---
const MOCK_UA_DATA = [
  { date: '周一', value: 420 },
  { date: '周二', value: 415 },
  { date: '周三', value: 430 },
  { date: '周四', value: 400 },
  { date: '周五', value: 390 },
  { date: '周六', value: 380 },
  { date: '周日', value: 375 },
];

// --- Sub-Components ---

const QuickActionTile: React.FC<{ icon: any, label: string, color: string, onClick: () => void }> = ({ icon: Icon, label, color, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] active:scale-95 transition-all"
  >
    <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center mb-2`}>
      <Icon size={20} className="text-white" />
    </div>
    <span className="text-xs font-bold text-slate-700">{label}</span>
  </button>
);

// --- Feature Screens ---

const PatientHome = ({ onNavigate }: { onNavigate: (screen: string) => void }) => {
  const handleMedicalFolderClick = () => {
    const profile = getMedicalFolderProfile();
    if (profile && profile.isInitialized) {
      onNavigate('folder-dashboard');
    } else {
      onNavigate('folder-init');
    }
  };

  const latestLog = getUALogs()[0] || { value: 375, status: 'Normal' };
  const attackCount = getAttackRecords().length;
  const water = getTodayWater();

  return (
    <ScrollArea className="px-5 pt-2">
      <div className="flex justify-between items-end mb-6">
        <div>
          <p className="text-slate-500 text-sm font-medium">早上好，</p>
          <h1 className="text-2xl font-bold text-slate-900">张伟</h1>
        </div>
        <div className="h-10 w-10 bg-slate-200 rounded-full overflow-hidden border-2 border-white shadow-sm" onClick={() => onNavigate('me')}>
           <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profile" className="w-full h-full bg-slate-100" />
        </div>
      </div>

      {/* Main Status Card */}
      <Card className="bg-[#0f766e] text-white border-none shadow-xl mb-6 relative overflow-hidden h-48">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-teal-400 opacity-10 rounded-full blur-xl"></div>
        
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-teal-200 text-xs font-bold uppercase tracking-wider mb-1">今日尿酸</p>
              <div className="flex items-baseline gap-2">
                 <span className="text-4xl font-bold tracking-tight">{latestLog.value}</span>
                 <span className="text-sm font-medium opacity-80">µmol/L</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full mt-2 border border-white/10">
                <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] ${latestLog.value > 420 ? 'bg-red-400' : 'bg-emerald-400'}`}></div>
                <span className="text-xs font-bold">{latestLog.value > 420 ? '超出目标' : '控制良好'}</span>
              </div>
            </div>
            
            <div className="relative w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ value: (water.current/water.goal)*100 }, { value: 100 - (water.current/water.goal)*100 }]} innerRadius={22} outerRadius={28} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                    <Cell fill="#ffffff" />
                    <Cell fill="rgba(255,255,255,0.2)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-teal-100">
                <span className="text-[10px]">饮水</span>
                <span className="text-xs font-bold leading-none">{Math.round((water.current/water.goal)*100)}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
             <button onClick={() => onNavigate('records')} className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl py-2 px-3 text-xs font-bold flex items-center justify-center gap-2 transition-all">
               <Plus size={14} /> 记录数值
             </button>
             <button onClick={() => onNavigate('tasks')} className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl py-2 px-3 text-xs font-bold flex items-center justify-center gap-2 transition-all">
               <CheckCircle size={14} /> 今日任务
             </button>
          </div>
        </div>
      </Card>

      {/* Metrics Row */}
      <div className="flex gap-3 mb-6 overflow-x-auto no-scrollbar pb-2">
        <div className="min-w-[140px] flex-1">
          <StatCard title="近期趋势" value="下降 5%" trend="down" icon={TrendingUp} color="text-emerald-500" />
        </div>
        <div className="min-w-[140px] flex-1">
           <Card className="flex flex-col justify-between h-full min-h-[110px]" onClick={() => onNavigate('attack')}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 text-xs font-semibold uppercase">发作频率</span>
                <Zap size={18} className="text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{attackCount} 次</div>
                <div className="text-xs mt-1 text-slate-400 font-medium">最近 30 天</div>
              </div>
           </Card>
        </div>
      </div>

      <SectionHeader title="快速记录" />
      <div className="grid grid-cols-3 gap-3 mb-8">
        <QuickActionTile icon={Folder} label="病历夹" color="bg-cyan-500" onClick={handleMedicalFolderClick} />
        <QuickActionTile icon={Utensils} label="饮食记录" color="bg-orange-400" onClick={() => onNavigate('diet')} />
        <QuickActionTile icon={Droplets} label="饮水打卡" color="bg-blue-400" onClick={() => onNavigate('water')} />
        <QuickActionTile icon={Pill} label="用药打卡" color="bg-purple-400" onClick={() => onNavigate('meds')} />
        <QuickActionTile icon={Zap} label="记录痛风" color="bg-red-400" onClick={() => onNavigate('attack')} />
        <QuickActionTile icon={BookOpen} label="知识库" color="bg-indigo-400" onClick={() => onNavigate('knowledge')} />
      </div>
    </ScrollArea>
  );
};

const PatientRecordUA = ({ onBack }: { onBack: () => void }) => {
  const [value, setValue] = useState<string>('360');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState<UricAcidLog[]>(getUALogs());
  const [showHistory, setShowHistory] = useState(false);

  // Status calculation
  const numVal = parseInt(value) || 0;
  const getStatus = (v: number) => {
    if (v < 360) return { label: '控制极佳', color: 'text-emerald-600', bg: 'bg-emerald-100', bar: 'bg-emerald-500' };
    if (v <= 420) return { label: '正常范围', color: 'text-teal-600', bg: 'bg-teal-100', bar: 'bg-teal-500' };
    if (v <= 480) return { label: '轻度偏高', color: 'text-amber-600', bg: 'bg-amber-100', bar: 'bg-amber-500' };
    if (v <= 540) return { label: '中度偏高', color: 'text-orange-600', bg: 'bg-orange-100', bar: 'bg-orange-500' };
    return { label: '重度偏高', color: 'text-red-600', bg: 'bg-red-100', bar: 'bg-red-500' };
  };

  const status = getStatus(numVal);

  const handleSave = () => {
    if (!numVal) return;
    addUALog(numVal, date, new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    setLogs(getUALogs());
    alert('记录已保存！');
    onBack();
  };

  // Chart data preparation: Reverse to show oldest to newest left to right
  const chartData = [...logs].reverse().map(l => ({ date: l.date.slice(5), value: l.value }));

  return (
    <ScrollArea className="px-5 pt-2 bg-slate-50">
       <AppHeader title="记录尿酸" onBack={onBack} transparent />
       
       <div className="mt-4 mb-8">
         <Card className="flex flex-col items-center py-8 relative overflow-hidden border-none shadow-lg">
            {/* Background decoration */}
            <div className={`absolute top-0 left-0 w-full h-2 ${status.bar}`}></div>
            
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">输入检测数值</span>
            
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <input 
                type="number" 
                inputMode="numeric"
                value={value}
                onChange={e => setValue(e.target.value)}
                className={`text-6xl font-bold text-center w-48 bg-transparent outline-none ${status.color}`}
              />
              <span className="text-slate-400 font-medium text-lg">µmol/L</span>
            </div>

            <div className={`px-4 py-1.5 rounded-full ${status.bg} ${status.color} text-sm font-bold mb-6 flex items-center gap-1.5`}>
               <Activity size={16} />
               {status.label}
            </div>

            {/* Range Bar */}
            <div className="w-full px-8">
               <div className="h-2 w-full bg-slate-100 rounded-full flex overflow-hidden mb-2">
                  <div className="flex-[3] bg-emerald-300"></div> {/* 0-360 */}
                  <div className="flex-[1] bg-teal-300"></div> {/* 360-420 */}
                  <div className="flex-[2] bg-amber-300"></div> {/* 420-540 */}
                  <div className="flex-[2] bg-red-300"></div> {/* 540+ */}
               </div>
               <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>0</span>
                  <span className="text-emerald-600">360</span>
                  <span className="text-teal-600">420</span>
                  <span>...</span>
               </div>
            </div>
         </Card>
       </div>

       <SectionHeader title="日期时间" />
       <Card className="mb-6">
          <div className="flex items-center gap-4 p-2">
             <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
               <CalendarIcon size={20} />
             </div>
             <input 
               type="date" 
               value={date}
               onChange={e => setDate(e.target.value)}
               className="flex-1 bg-transparent text-slate-900 font-bold outline-none"
             />
             <ChevronRight size={20} className="text-slate-300" />
          </div>
       </Card>

       <SectionHeader title="历史趋势" action={<button onClick={() => setShowHistory(!showHistory)} className="text-teal-600 text-xs font-bold">查看列表</button>}/>
       <Card className="h-64 mb-24 pt-6">
          <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
               <defs>
                 <linearGradient id="colorUa" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                   <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                 </linearGradient>
               </defs>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="date" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
               <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} domain={[200, 600]} />
               <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  itemStyle={{color: '#0f766e', fontWeight: 'bold'}}
               />
               <ReferenceLine y={420} stroke="#f87171" strokeDasharray="3 3" label={{ position: 'right',  value: '上限', fontSize: 10, fill: '#f87171' }} />
               <ReferenceLine y={360} stroke="#34d399" strokeDasharray="3 3" label={{ position: 'right',  value: '达标', fontSize: 10, fill: '#34d399' }} />
               <Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorUa)" />
             </AreaChart>
          </ResponsiveContainer>
       </Card>

       <div className="fixed bottom-8 left-0 w-full px-5 z-20">
          <Button fullWidth size="lg" onClick={handleSave} className="shadow-xl shadow-teal-500/20">
             保存记录
          </Button>
       </div>
    </ScrollArea>
  );
};

const PatientRecordAttack = ({ onBack }: { onBack: () => void }) => {
    const [view, setView] = useState('record'); // 'record' | 'stats'
    const [pain, setPain] = useState(5);
    const [part, setPart] = useState('左第一跖趾');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
    
    const records = getAttackRecords();

    const parts = [
        { id: '左第一跖趾', label: '左大脚趾' },
        { id: '右第一跖趾', label: '右大脚趾' },
        { id: '左踝', label: '左脚踝' },
        { id: '右踝', label: '右脚踝' },
        { id: '左膝', label: '左膝盖' },
        { id: '右膝', label: '右膝盖' },
        { id: '手指', label: '手指关节' },
        { id: '其他', label: '其他部位' }
    ];
    
    const triggers = ['高嘌呤饮食', '饮酒', '含糖饮料', '受凉', '剧烈运动', '熬夜劳累', '忘记吃药', '不明原因'];
  
    const toggleTrigger = (t: string) => {
      if (selectedTriggers.includes(t)) {
        setSelectedTriggers(selectedTriggers.filter(i => i !== t));
      } else {
        setSelectedTriggers([...selectedTriggers, t]);
      }
    };
  
    const handleSave = () => {
      addAttackRecord({
        date,
        bodyPart: part,
        painLevel: pain,
        triggers: selectedTriggers
      });
      alert('痛风发作记录已保存');
      setView('stats'); // Switch to stats after saving
    };

    // --- Statistics Logic ---
    const totalAttacks = records.length;
    const maxPain = records.length > 0 ? Math.max(...records.map(r => r.painLevel)) : 0;
    
    // Process triggers for chart
    const triggerCounts: {[key: string]: number} = {};
    records.forEach(r => {
        r.triggers.forEach(t => {
            triggerCounts[t] = (triggerCounts[t] || 0) + 1;
        });
    });
    const triggerData = Object.keys(triggerCounts)
        .map(k => ({ name: k, value: triggerCounts[k] }))
        .sort((a, b) => b.value - a.value);

    // Process Body Parts for chart
    const partCounts: {[key: string]: number} = {};
    records.forEach(r => {
        partCounts[r.bodyPart] = (partCounts[r.bodyPart] || 0) + 1;
    });
    const partData = Object.keys(partCounts)
        .map(k => ({ name: k, count: partCounts[k] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5
    
    const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
  
    return (
      <ScrollArea className="px-5 pt-2 bg-slate-50">
         <AppHeader title="痛风记录" onBack={onBack} transparent />
         
         <div className="mb-6">
            <SegmentedControl 
                options={['记录发作', '发作统计']} 
                selected={view === 'record' ? '记录发作' : '发作统计'} 
                onChange={(val) => setView(val === '记录发作' ? 'record' : 'stats')}
            />
         </div>

         {view === 'record' ? (
             <div className="animate-fade-in pb-24">
                <Card className="mb-4 mt-2">
                    <SectionHeader title="发作日期" className="mt-0 mb-3" />
                    <input 
                        type="date" 
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-red-500 transition-all"
                    />
                </Card>

                <Card className="mb-4">
                    <SectionHeader title="疼痛等级" className="mt-0 mb-3" />
                    <div className="px-2 pb-2">
                        <PainSlider value={pain} onChange={setPain} />
                    </div>
                </Card>

                <Card className="mb-4">
                    <SectionHeader title="发作部位" className="mt-0 mb-3" />
                    <div className="grid grid-cols-4 gap-2">
                        {parts.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setPart(p.id)}
                                className={`py-3 px-1 rounded-xl text-xs font-bold transition-all border ${
                                    part === p.id 
                                    ? 'bg-red-50 border-red-500 text-red-600' 
                                    : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </Card>

                <Card className="mb-6">
                    <SectionHeader title="可能的诱因 (多选)" className="mt-0 mb-3" />
                    <div className="flex flex-wrap gap-2">
                        {triggers.map(t => (
                            <button
                                key={t}
                                onClick={() => toggleTrigger(t)}
                                className={`py-2 px-3 rounded-full text-xs font-bold transition-all border ${
                                    selectedTriggers.includes(t)
                                    ? 'bg-slate-800 border-slate-800 text-white' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </Card>
        
                <div className="fixed bottom-8 left-0 w-full px-5 z-20">
                    <Button fullWidth size="lg" onClick={handleSave} className="bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/20">
                    保存记录
                    </Button>
                </div>
             </div>
         ) : (
             <div className="animate-fade-in pb-8">
                 <div className="grid grid-cols-2 gap-3 mb-6">
                     <StatCard 
                        title="累计发作" 
                        value={`${totalAttacks}次`} 
                        icon={Activity} 
                        color="text-red-500" 
                     />
                     <StatCard 
                        title="最高疼痛" 
                        value={`${maxPain}级`} 
                        subtext={maxPain > 7 ? '剧烈疼痛' : '中度疼痛'} 
                        icon={Flame} 
                        color="text-amber-500"
                        trend="up"
                     />
                 </div>

                 {totalAttacks > 0 ? (
                    <>
                        <SectionHeader title="诱因分析" />
                        <Card className="mb-6 h-64 flex flex-col items-center justify-center">
                            {triggerData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={triggerData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {triggerData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-slate-400 text-sm">暂无诱因数据</p>
                            )}
                        </Card>

                        <SectionHeader title="高频发作部位" />
                        <Card className="mb-6 p-4">
                            {partData.map((item, index) => (
                                <div key={item.name} className="mb-4 last:mb-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${index === 0 ? 'bg-red-500' : 'bg-slate-300'}`}>{index + 1}</span>
                                            {item.name}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400">{item.count}次</span>
                                    </div>
                                    <ProgressBar progress={(item.count / totalAttacks) * 100} color="bg-red-400" className="h-1.5" />
                                </div>
                            ))}
                        </Card>

                        <SectionHeader title="发作历史" />
                        <div className="space-y-3">
                            {[...records].reverse().map((r) => (
                                <Card key={r.id} className="p-4 border-l-4 border-l-red-500">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-slate-800">{r.date}</span>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${r.painLevel > 6 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                            疼痛 {r.painLevel}级
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600">部位: {r.bodyPart}</span>
                                        <div className="flex gap-1">
                                            {r.triggers.slice(0, 2).map(t => (
                                                <span key={t} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                 ) : (
                     <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                         <Folder size={48} className="mb-4 opacity-20" />
                         <p>暂无发作记录，请先添加记录</p>
                     </div>
                 )}
             </div>
         )}
      </ScrollArea>
    )
}

const PatientRecordWater = ({ onBack }: { onBack: () => void }) => {
  const [data, setData] = useState<WaterDaily>(getTodayWater());

  const handleAdd = (amount: number, type: WaterRecord['type']) => {
    const updated = addWater(amount, type);
    setData(updated);
  };

  const percent = Math.min((data.current / data.goal) * 100, 100);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <ScrollArea className="px-5 pt-2 bg-slate-50">
      <AppHeader title="饮水打卡" onBack={onBack} transparent />
      
      {/* Progress Ring Card */}
      <div className="flex flex-col items-center justify-center mt-4 mb-8 relative">
          <div className="relative w-48 h-48">
             {/* Background Circle */}
             <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  stroke="#e2e8f0"
                  strokeWidth="12"
                  fill="transparent"
                />
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  stroke="#3b82f6"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Droplets size={32} className="text-blue-500 mb-1" fill="currentColor" />
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-900">{data.current}</span>
                    <span className="text-xs text-slate-400 font-bold">ml</span>
                </div>
                <span className="text-xs text-slate-400 font-medium mt-1">目标 {data.goal}</span>
             </div>
          </div>
          
          {percent >= 100 && (
             <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 mt-4 animate-bounce">
                <Trophy size={14} /> 恭喜！今日饮水目标已达成
             </div>
          )}
      </div>

      <SectionHeader title="快捷记录" />
      <div className="grid grid-cols-3 gap-4 mb-8">
          <button 
             onClick={() => handleAdd(200, 'cup')}
             className="bg-white p-4 rounded-2xl flex flex-col items-center shadow-sm border border-slate-100 active:scale-95 transition-all active:bg-blue-50 active:border-blue-200"
          >
             <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2 text-blue-500">
                <GlassWater size={20} />
             </div>
             <span className="text-sm font-bold text-slate-700">一杯水</span>
             <span className="text-xs text-slate-400">+200ml</span>
          </button>
          
          <button 
             onClick={() => handleAdd(500, 'bottle')}
             className="bg-white p-4 rounded-2xl flex flex-col items-center shadow-sm border border-slate-100 active:scale-95 transition-all active:bg-blue-50 active:border-blue-200"
          >
             <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center mb-2 text-cyan-500">
                <Coffee size={20} />
             </div>
             <span className="text-sm font-bold text-slate-700">一瓶水</span>
             <span className="text-xs text-slate-400">+500ml</span>
          </button>

          <button 
             onClick={() => handleAdd(150, 'drink')}
             className="bg-white p-4 rounded-2xl flex flex-col items-center shadow-sm border border-slate-100 active:scale-95 transition-all active:bg-blue-50 active:border-blue-200"
          >
             <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mb-2 text-indigo-500">
                <Wine size={20} />
             </div>
             <span className="text-sm font-bold text-slate-700">其他</span>
             <span className="text-xs text-slate-400">+150ml</span>
          </button>
      </div>

      <SectionHeader title="今日明细" />
      <div className="space-y-3 pb-8">
         {data.records.length > 0 ? data.records.map((r) => (
             <Card key={r.id} className="flex items-center justify-between p-4">
                 <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                         {r.type === 'cup' ? <GlassWater size={16}/> : r.type === 'bottle' ? <Coffee size={16}/> : <Droplets size={16}/>}
                     </div>
                     <span className="text-sm font-bold text-slate-700">
                        {r.type === 'cup' ? '饮水' : r.type === 'bottle' ? '瓶装水' : '饮料'}
                     </span>
                 </div>
                 <div className="text-right">
                     <div className="text-sm font-bold text-blue-600">+{r.amount} ml</div>
                     <div className="text-xs text-slate-400">{r.time}</div>
                 </div>
             </Card>
         )) : (
             <div className="text-center py-8 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100 border-dashed">
                 还没有喝水记录，快去喝一杯吧！
             </div>
         )}
      </div>
    </ScrollArea>
  );
};

// --- Diet Components ---

const PatientDietAdd = ({ onBack, meal, date }: { onBack: () => void, meal: string, date: string }) => {
    const [search, setSearch] = useState('');
    const db = getFoodDatabase();

    const filtered = db.filter(item => item.name.includes(search));

    const handleAdd = (item: FoodDatabaseItem) => {
        addDietLog({
            date: date,
            meal: meal as any,
            foodId: item.id,
            foodName: item.name,
            amount: 1, // Default serving
            calories: item.calories,
            purine: item.purine
        });
        onBack();
    };

    const getPurineColor = (p: string) => {
        if(p === 'Low') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if(p === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-red-100 text-red-700 border-red-200';
    };

    const getPurineLabel = (p: string) => {
        if(p === 'Low') return '低嘌呤 (推荐)';
        if(p === 'Medium') return '中嘌呤 (适量)';
        return '高嘌呤 (少吃)';
    }

    return (
        <ScrollArea className="px-5 pt-2 bg-slate-50">
            <AppHeader title={`添加${meal === 'breakfast' ? '早餐' : meal === 'lunch' ? '午餐' : meal === 'dinner' ? '晚餐' : '加餐'}`} onBack={onBack} transparent />
            
            <div className="relative mb-6 mt-2">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                    type="text" 
                    autoFocus
                    placeholder="搜索食物名称，如：米饭、鸡肉..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-xl shadow-sm border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
            </div>

            <div className="space-y-3 pb-24">
                {filtered.map(item => (
                    <Card key={item.id} className="flex justify-between items-center p-4 active:scale-[0.98]" onClick={() => handleAdd(item)}>
                        <div>
                            <h4 className="font-bold text-slate-900">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-500">{item.calories} 千卡/份</span>
                                <span className="text-[10px] text-slate-300">•</span>
                                <span className="text-xs text-slate-500">{item.type}</span>
                            </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getPurineColor(item.purine)}`}>
                            {getPurineLabel(item.purine)}
                        </div>
                    </Card>
                ))}
                {filtered.length === 0 && (
                     <div className="text-center py-12 text-slate-400">
                        <Utensils size={40} className="mx-auto mb-2 opacity-20" />
                        <p>未找到相关食物</p>
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}

const PatientRecordDiet = ({ onBack, onAdd }: { onBack: () => void, onAdd: (meal: string, date: string) => void }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const logs = getDietLogs(date);

    // Calculate Stats
    const totalCals = logs.reduce((acc, curr) => acc + curr.calories, 0);
    const targetCals = 2000;
    
    // Calculate Purine Risk (Simple heuristic: if any high purine food, risk is high)
    const hasHighPurine = logs.some(l => l.purine === 'High');
    const hasMediumPurine = logs.some(l => l.purine === 'Medium');
    const purineStatus = hasHighPurine ? 'High' : hasMediumPurine ? 'Medium' : 'Low';

    const renderMealSection = (meal: string, label: string) => {
        const mealLogs = logs.filter(l => l.meal === meal);
        const mealCals = mealLogs.reduce((acc, curr) => acc + curr.calories, 0);

        return (
            <div className="mb-6">
                <div className="flex justify-between items-end mb-3 px-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800">{label}</h3>
                        <span className="text-xs text-slate-400 font-medium">{mealCals} 千卡</span>
                    </div>
                    <button 
                        onClick={() => onAdd(meal, date)}
                        className="text-xs font-bold text-orange-500 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-full hover:bg-orange-100"
                    >
                        <Plus size={12} /> 添加
                    </button>
                </div>
                
                {mealLogs.length > 0 ? (
                    <div className="space-y-2">
                        {mealLogs.map(log => (
                            <Card key={log.id} className="p-3 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                     {/* Simple Icon based on purine */}
                                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${log.purine === 'High' ? 'bg-red-100 text-red-500' : log.purine === 'Medium' ? 'bg-amber-100 text-amber-500' : 'bg-emerald-100 text-emerald-500'}`}>
                                        <Leaf size={16} />
                                     </div>
                                     <div>
                                        <div className="font-bold text-slate-700 text-sm">{log.foodName}</div>
                                        <div className="text-[10px] text-slate-400">{log.calories} 千卡</div>
                                     </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${log.purine === 'High' ? 'bg-red-50 text-red-600' : log.purine === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {log.purine === 'High' ? '高嘌呤' : log.purine === 'Medium' ? '中嘌呤' : '低嘌呤'}
                                    </span>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
                        暂无记录
                    </div>
                )}
            </div>
        );
    };

    return (
        <ScrollArea className="px-5 pt-2 bg-slate-50">
            <AppHeader title="饮食记录" onBack={onBack} transparent />
            
            <Card className="mb-6 mt-2">
                 <div className="flex items-center gap-4 p-2 border-b border-slate-50 mb-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <CalendarIcon size={16} />
                    </div>
                    <input 
                        type="date" 
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="flex-1 bg-transparent text-slate-900 font-bold outline-none text-sm"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-8 px-2 pb-2">
                     <div className="text-center border-r border-slate-100">
                         <div className="text-xs text-slate-400 font-bold uppercase mb-1">今日摄入</div>
                         <div className="text-2xl font-bold text-slate-900">{totalCals}</div>
                         <div className="text-[10px] text-slate-400 mt-1">目标 {targetCals}</div>
                     </div>
                     <div className="text-center">
                         <div className="text-xs text-slate-400 font-bold uppercase mb-1">嘌呤风险</div>
                         {purineStatus === 'Low' && <div className="text-lg font-bold text-emerald-600 flex items-center justify-center gap-1"><ThumbsUp size={18}/> 安全</div>}
                         {purineStatus === 'Medium' && <div className="text-lg font-bold text-amber-600 flex items-center justify-center gap-1"><AlertTriangle size={18}/> 适量</div>}
                         {purineStatus === 'High' && <div className="text-lg font-bold text-red-600 flex items-center justify-center gap-1"><AlertCircle size={18}/> 超标</div>}
                         <div className="text-[10px] text-slate-400 mt-1">基于今日食材</div>
                     </div>
                 </div>
                 
                 <div className="mt-4 pt-4 border-t border-slate-50 px-2">
                    <ProgressBar progress={(totalCals / targetCals) * 100} color={totalCals > targetCals ? 'bg-red-500' : 'bg-orange-500'} className="h-1.5" />
                 </div>
            </Card>

            <div className="pb-24">
                {renderMealSection('breakfast', '早餐')}
                {renderMealSection('lunch', '午餐')}
                {renderMealSection('dinner', '晚餐')}
                {renderMealSection('snack', '加餐/零食')}
            </div>
        </ScrollArea>
    );
};

const PatientKnowledge = ({ onBack }: { onBack: () => void }) => {
    const articles = getArticles();
    const categories = ['全部', '饮食', '药物', '基础', '生活'];
    const [activeCat, setActiveCat] = useState('全部');

    const filtered = activeCat === '全部' ? articles : articles.filter(a => a.category === activeCat);

    return (
        <ScrollArea className="px-5 pt-2 bg-slate-50">
            <AppHeader title="知识库" onBack={onBack} transparent />
            
            <div className="relative mb-6">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="搜索文章、指南..." 
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-xl shadow-sm border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
            </div>

            {/* Featured Card (Text-only gradient) */}
            <div className="mb-8 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white shadow-lg shadow-slate-200">
                <span className="inline-block px-2 py-1 bg-white/20 rounded text-[10px] font-bold mb-3 backdrop-blur-md">每日精选</span>
                <h3 className="text-xl font-bold leading-tight mb-2">痛风发作时的“黄金24小时”处理法则</h3>
                <p className="text-slate-300 text-xs mb-4 line-clamp-2">急性期如何快速止痛？冷敷还是热敷？这里有最权威的解答。</p>
                <button className="text-xs font-bold bg-white text-slate-900 px-4 py-2 rounded-full hover:bg-slate-100 transition-colors">
                    立即阅读
                </button>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
                {categories.map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setActiveCat(cat)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                            activeCat === cat 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="space-y-4 pb-12">
                {filtered.map(article => (
                    <Card key={article.id} className="p-5 active:scale-[0.99]">
                        <div className="flex justify-between items-start mb-2">
                             <div className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold">{article.category}</div>
                             <span className="text-[10px] text-slate-400">{article.readTime}阅读</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-base mb-2 leading-snug">{article.title}</h4>
                        <div className="flex items-center gap-4 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1"><Eye size={12}/> {article.views}</span>
                        </div>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    )
}

// --- Medical Folder Components ---

const PatientFolderInit = ({ onFinish }: { onFinish: () => void }) => {
  const [formData, setFormData] = useState({
    name: '张伟',
    gender: '男',
    birthDate: '1989-01-01',
    diagnosisYear: '2021',
  });

  const handleSubmit = () => {
    initMedicalFolder({
      basicInfo: {
        ...formData,
        height: '175',
        weight: '80',
        bloodType: 'A'
      }
    });
    onFinish();
  };

  return (
    <ScrollArea className="px-5 pt-2 bg-white">
       <AppHeader title="建立健康档案" transparent />
       <div className="mt-8 mb-8 text-center">
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <Folder size={40} className="text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">欢迎使用病历夹</h2>
          <p className="text-sm text-slate-500 mt-2 px-8">完善您的基础信息，系统将为您建立专属的健康档案，方便随访与管理。</p>
       </div>

       <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">姓名</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 outline-none focus:border-teal-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">性别</label>
            <div className="flex gap-4">
              {['男', '女'].map(g => (
                <button 
                  key={g} 
                  onClick={() => setFormData({...formData, gender: g})}
                  className={`flex-1 py-3 rounded-xl font-bold border ${formData.gender === g ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-slate-50 border-transparent text-slate-500'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">出生日期</label>
            <input 
              type="date" 
              value={formData.birthDate} 
              onChange={e => setFormData({...formData, birthDate: e.target.value})}
              className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 outline-none focus:border-teal-500" 
            />
          </div>
       </div>

       <div className="fixed bottom-8 left-0 w-full px-5">
         <Button fullWidth size="lg" onClick={handleSubmit}>立即建立档案</Button>
       </div>
    </ScrollArea>
  );
};

const PatientFolderDashboard = ({ onBack, onNavigate }: { onBack: () => void, onNavigate: (section: string) => void }) => {
  const profile = getMedicalFolderProfile();
  
  // Helper to calculate age safely
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  const menuItems = [
    { id: 'basicInfo', label: '基本信息', icon: User, color: 'bg-cyan-100', iconColor: 'text-cyan-600' },
    { id: 'history', label: '病史记录', icon: FileText, color: 'bg-orange-100', iconColor: 'text-orange-600' },
    { id: 'pastHistory', label: '既往史', icon: FileClock, color: 'bg-violet-100', iconColor: 'text-violet-600' },
    { id: 'lifestyle', label: '生活史', icon: Droplets, color: 'bg-lime-100', iconColor: 'text-lime-600' },
    { id: 'allergies', label: '过敏史', icon: Dna, color: 'bg-sky-100', iconColor: 'text-sky-600' },
    { id: 'familyHistory', label: '家族史', icon: UsersIcon, color: 'bg-blue-100', iconColor: 'text-blue-600' },
    { id: 'physicalExam', label: '体格检查', icon: Accessibility, color: 'bg-indigo-100', iconColor: 'text-indigo-600' },
    { id: 'labTests', label: '化验检查', icon: FlaskConical, color: 'bg-teal-100', iconColor: 'text-teal-600' },
    { id: 'medicationHistory', label: '用药记录', icon: Pill, color: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { id: 'assessment', label: '病情评估', icon: ClipboardCheck, color: 'bg-blue-100', iconColor: 'text-blue-600' },
    { id: 'followup', label: '复诊随访', icon: Stethoscope, color: 'bg-blue-100', iconColor: 'text-blue-600' },
    { id: 'healthReport', label: '健康报告', icon: Activity, color: 'bg-rose-100', iconColor: 'text-rose-600' },
  ];

  return (
    <ScrollArea className="px-5 pt-2 bg-slate-50">
      <AppHeader title="病历夹" onBack={onBack} transparent />
      
      {/* Medical ID Card - Optimized Layout */}
      <div className="relative overflow-hidden rounded-2xl mb-8 mt-2 shadow-xl shadow-teal-900/10 animate-fade-in">
         {/* Background Gradient */}
         <div className="absolute inset-0 bg-gradient-to-br from-[#0f766e] to-[#0d9488]"></div>
         {/* Decorative Circles */}
         <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-5 rounded-full blur-3xl"></div>
         <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-teal-400 opacity-10 rounded-full blur-3xl"></div>

         <div className="relative p-6 text-white z-10">
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 shadow-inner">
                        <span className="text-2xl font-bold">{profile?.basicInfo.name?.[0]}</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">{profile?.basicInfo.name}</h2>
                        <div className="flex items-center gap-2 mt-1 opacity-90">
                           <span className="text-xs font-medium bg-teal-800/30 px-2 py-0.5 rounded backdrop-blur-md">ID: 88219</span>
                           <span className="text-xs">{profile?.basicInfo.gender} • {calculateAge(profile?.basicInfo.birthDate || '')}岁</span>
                        </div>
                    </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-2 rounded-lg border border-white/10">
                   <Lock size={18} className="text-teal-100" />
                </div>
            </div>

            {/* Profile Completion Bar */}
            <div className="mt-4">
               <div className="flex justify-between text-xs font-bold text-teal-100 mb-1.5">
                  <span>档案完善度</span>
                  <span>85%</span>
               </div>
               <div className="w-full h-1.5 bg-teal-900/30 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-200 w-[85%] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
               </div>
            </div>
         </div>
      </div>

      {/* Grid Layout - Optimized */}
      <div className="grid grid-cols-3 gap-4 pb-12">
        {menuItems.map((item, idx) => (
          <button 
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="group bg-white rounded-2xl p-4 flex flex-col items-center justify-center aspect-square shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] active:scale-95 active:shadow-none transition-all duration-200 border border-transparent hover:border-slate-100"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
             <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center mb-3 transition-transform group-active:scale-90 shadow-sm`}>
                <item.icon size={22} className={item.iconColor} strokeWidth={2.5} />
             </div>
             <span className="text-[11px] font-bold text-slate-600 tracking-tight group-hover:text-slate-900">{item.label}</span>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};

const PatientFolderDetail = ({ section, onBack }: { section: string, onBack: () => void }) => {
  const [profile, setProfile] = useState<MedicalFolderProfile | null>(getMedicalFolderProfile());
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<any>(null);

  if (!profile) return null;

  const sectionConfig: Record<string, string> = {
    basicInfo: '基本信息',
    history: '病史记录',
    pastHistory: '既往史',
    lifestyle: '生活史',
    allergies: '过敏史',
    familyHistory: '家族史',
    medicationHistory: '用药记录',
    physicalExam: '体格检查',
    labTests: '化验检查',
    assessment: '病情评估',
    followup: '复诊随访',
    healthReport: '健康报告'
  };

  const title = sectionConfig[section] || '详细信息';

  const handleEdit = () => {
    setEditValue(profile[section as keyof MedicalFolderProfile]);
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMedicalFolderSection(section as keyof MedicalFolderProfile, editValue);
    setProfile(getMedicalFolderProfile());
    setIsEditing(false);
  };

  const renderContent = () => {
    const data = profile[section as keyof MedicalFolderProfile];

    if (section === 'basicInfo') {
        // Special render for basic info object
        const info = data as typeof profile.basicInfo;
        return (
            <div className="space-y-4">
                {Object.entries(info).map(([key, val]) => (
                    <div key={key} className="flex justify-between py-3 border-b border-slate-50 last:border-0">
                        <span className="text-slate-500 text-sm font-medium capitalize">{key}</span>
                        <span className="text-slate-900 text-sm font-bold">{val}</span>
                    </div>
                ))}
            </div>
        );
    }
    
    if (section === 'allergies') {
        const list = data as string[];
        return (
            <div className="flex flex-wrap gap-2">
                {list.length > 0 ? list.map((tag, i) => (
                    <span key={i} className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-sm font-bold">{tag}</span>
                )) : <span className="text-slate-400 text-sm">无记录</span>}
            </div>
        )
    }

    // Default text render
    return <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{data as string || '暂无记录'}</p>;
  };

  const renderEditor = () => {
      if (section === 'basicInfo') {
          const info = editValue as typeof profile.basicInfo;
          return (
              <div className="space-y-4">
                  {Object.keys(info).map((key) => (
                      <div key={key}>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{key}</label>
                          <input 
                             type="text"
                             value={(info as any)[key]}
                             onChange={(e) => setEditValue({...info, [key]: e.target.value})}
                             className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-teal-500 transition-all"
                          />
                      </div>
                  ))}
              </div>
          )
      }

      if (section === 'allergies') {
          const list = editValue as string[];
          const strVal = list.join(', ');
          return (
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">过敏原 (用逗号分隔)</label>
                  <input 
                      type="text"
                      value={strVal}
                      onChange={(e) => setEditValue(e.target.value.split(/[,，]/).map(s => s.trim()).filter(Boolean))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-teal-500 transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-2">例如：青霉素, 海鲜, 芒果</p>
              </div>
          )
      }

      return (
          <textarea 
              value={editValue as string}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full h-64 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed outline-none focus:border-teal-500 transition-all resize-none"
              placeholder="请输入详细记录..."
          />
      );
  };

  return (
      <ScrollArea className="px-5 pt-2 bg-white">
          <AppHeader 
              title={title} 
              onBack={onBack} 
              transparent 
              right={
                  isEditing ? (
                    <button onClick={handleSave} className="text-teal-600 p-2 font-bold text-sm bg-teal-50 rounded-lg">保存</button>
                  ) : (
                    <button onClick={handleEdit} className="text-slate-500 p-2 hover:bg-slate-100 rounded-full transition-colors"><Edit2 size={18} /></button>
                  )
              }
          />
          <div className="mt-4 pb-12">
              {isEditing ? renderEditor() : renderContent()}
          </div>
      </ScrollArea>
  );
};

// --- Main App Component ---

export const PatientApp = ({ onSwitchRole }: { onSwitchRole: () => void }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedMeal, setSelectedMeal] = useState<{meal: string, date: string} | null>(null);
  const [folderSection, setFolderSection] = useState<string>('basicInfo');

  const tabs = [
    { id: 'home', label: '首页', icon: Home },
    { id: 'records', label: '记录', icon: Activity },
    { id: 'tasks', label: '任务', icon: CheckCircle },
    { id: 'me', label: '我的', icon: User },
  ];

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    if (id === 'home' || id === 'records' || id === 'tasks' || id === 'me') {
       setCurrentScreen(id);
    }
  };

  const handleDietAdd = (meal: string, date: string) => {
      setSelectedMeal({ meal, date });
      setCurrentScreen('diet-add');
  };

  const renderScreen = () => {
      switch(currentScreen) {
          case 'home': return <PatientHome onNavigate={setCurrentScreen} />;
          case 'records': return <PatientRecordUA onBack={() => setCurrentScreen('home')} />; // Placeholder for general records
          case 'ua': return <PatientRecordUA onBack={() => setCurrentScreen('home')} />;
          case 'attack': return <PatientRecordAttack onBack={() => setCurrentScreen('home')} />;
          case 'water': return <PatientRecordWater onBack={() => setCurrentScreen('home')} />;
          case 'diet': return <PatientRecordDiet onBack={() => setCurrentScreen('home')} onAdd={handleDietAdd} />;
          case 'diet-add': return <PatientDietAdd onBack={() => setCurrentScreen('diet')} meal={selectedMeal?.meal || 'snack'} date={selectedMeal?.date || ''} />;
          case 'knowledge': return <PatientKnowledge onBack={() => setCurrentScreen('home')} />;
          
          // Medical Folder Routes
          case 'folder-init': return <PatientFolderInit onFinish={() => setCurrentScreen('folder-dashboard')} />;
          case 'folder-dashboard': return <PatientFolderDashboard onBack={() => setCurrentScreen('home')} onNavigate={(section) => { setFolderSection(section); setCurrentScreen('folder-detail'); }} />;
          case 'folder-detail': return <PatientFolderDetail section={folderSection} onBack={() => setCurrentScreen('folder-dashboard')} />;

          case 'tasks': return <div className="p-8 text-center text-slate-400">任务中心开发中...</div>;
          case 'me': 
            return (
              <ScrollArea className="px-5 pt-2">
                 <AppHeader title="个人中心" transparent />
                 <div className="mt-6">
                    <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                        <h3 className="text-xl font-bold text-red-800 mb-4">账户切换</h3>
                        <p className="text-sm text-slate-600 mb-8 leading-relaxed">
                            清空当前登录信息，重新选择医生/非医生账号
                        </p>
                        <button 
                            onClick={onSwitchRole}
                            className="w-full bg-red-500 hover:bg-red-600 text-white text-lg font-bold py-4 rounded-xl shadow-xl shadow-red-500/20 active:scale-[0.98] transition-all"
                        >
                            切换/退出登陆
                        </button>
                    </div>
                 </div>
              </ScrollArea>
            );
          default: return <PatientHome onNavigate={setCurrentScreen} />;
      }
  };

  return (
    <AppContainer>
      {renderScreen()}
      {['home', 'records', 'tasks', 'me'].includes(currentScreen) && (
        <BottomNav tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
      )}
    </AppContainer>
  );
};
