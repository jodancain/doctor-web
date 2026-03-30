import React, { useState, useEffect } from 'react';
import { 
  Users, CheckSquare, BarChart2, MessageSquare, User, 
  Search, Filter, AlertTriangle, ChevronRight, Bell,
  FileText, Activity, Phone, ArrowLeft, Send, Calendar,
  Clipboard, Stethoscope, Microscope, Image as ImageIcon,
  Clock, AlertCircle, Plus, X, Save, Trash2, Edit3
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { 
  AppContainer, ScrollArea, BottomNav, Card, StatCard, 
  SectionHeader, Button, Chip, AppHeader, SegmentedControl 
} from '../ui/Common';
import { DoctorStats } from '../../types';
import { MedicalRecord, getRecords, getRecordById, addRecord, updateRecord, deleteRecord } from '../../services/store';

const MOCK_STATS: DoctorStats = {
  totalPatients: 142,
  activePatients: 89,
  controlRate: 68,
  highRiskCount: 12,
};

const PATIENTS_LIST = [
    { id: '1', name: '王大明', age: 45, gender: '男', status: 'Critical', label: '高危', ua: 520, lastVisit: '2天前', alerts: ['尿酸持续升高', '痛风发作'] },
    { id: '2', name: '李晓红', age: 32, gender: '女', status: 'Normal', label: '正常', ua: 340, lastVisit: '1周前', alerts: [] },
    { id: '3', name: '张建国', age: 58, gender: '男', status: 'High', label: '偏高', ua: 450, lastVisit: '3天前', alerts: ['依从性差'] },
    { id: '4', name: '刘小丽', age: 29, gender: '女', status: 'Normal', label: '正常', ua: 310, lastVisit: '2周前', alerts: [] },
];

// --- Sub-Screens ---

const DoctorHome = ({ onNavigate }: { onNavigate: (s: string) => void }) => {
  return (
    <ScrollArea className="px-5 pt-2">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
           <div className="h-12 w-12 rounded-full bg-slate-200 overflow-hidden">
             <img src="https://picsum.photos/100/100?2" alt="Doctor" />
           </div>
           <div>
               <h1 className="text-xl font-bold text-slate-900">李医生</h1>
               <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">风湿免疫科</p>
           </div>
        </div>
        <Button variant="ghost" className="p-2 h-auto rounded-full bg-white shadow-sm border border-slate-100 relative">
            <Bell size={20} className="text-slate-600" />
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
         <StatCard title="患者总数" value={MOCK_STATS.totalPatients} />
         <StatCard title="达标率" value={`${MOCK_STATS.controlRate}%`} subtext="较上月 +2%" trend="down" /> 
         
         <Card className="bg-gradient-to-br from-red-50 to-white border-red-100 flex flex-col justify-between h-full shadow-red-100" onClick={() => onNavigate('alerts')}>
             <div className="flex justify-between items-start">
                 <span className="text-red-800 text-xs font-bold uppercase tracking-wider">高风险预警</span>
                 <AlertTriangle size={18} className="text-red-500" />
             </div>
             <div className="text-3xl font-bold text-red-600">{MOCK_STATS.highRiskCount}</div>
             <div className="text-xs text-red-800/70 font-medium">需要关注</div>
         </Card>
         <StatCard title="近期活跃" value={MOCK_STATS.activePatients} />
      </div>

      <SectionHeader title="待办事项" action={<span className="text-teal-600 text-xs font-bold">3 项</span>} />
      <div className="space-y-3">
         {[1, 2, 3].map((i) => (
             <Card key={i} className="flex items-center gap-4 py-4 relative overflow-hidden">
                 <div className={`absolute left-0 top-0 bottom-0 w-1 ${i === 1 ? 'bg-red-500' : 'bg-teal-500'}`}></div>
                 <div className="flex-1">
                     <h4 className="font-bold text-sm text-slate-800 mb-1">审核患者化验单</h4>
                     <p className="text-xs text-slate-500">患者: 王大明 • <span className="text-red-500 font-medium">今日截止</span></p>
                 </div>
                 <Button variant="secondary" size="sm" className="h-8">处理</Button>
             </Card>
         ))}
      </div>
    </ScrollArea>
  );
};

const DoctorPatientList = ({ onSelectPatient }: { onSelectPatient: (id: string) => void }) => {
    return (
        <ScrollArea className="px-5 pt-2">
            <AppHeader title="患者管理" transparent />
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="搜索姓名、ID..." 
                        className="w-full pl-10 pr-4 py-3 bg-white rounded-xl shadow-sm border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    />
                </div>
                <Button variant="secondary" className="px-3 h-auto aspect-square rounded-xl"><Filter size={18} /></Button>
            </div>
            
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                {['全部', '高危', '未达标', '近期活跃'].map((f, i) => (
                    <button key={f} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border ${i === 1 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-600'}`}>
                        {f}
                    </button>
                ))}
            </div>

            <div className="space-y-3 pb-8">
                {PATIENTS_LIST.map((p, i) => (
                    <Card key={i} className="flex justify-between items-center active:scale-[0.98] transition-transform" onClick={() => onSelectPatient(p.id)}>
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg border-2 border-white shadow-sm">
                                {p.name[0]}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-slate-900 text-base">{p.name}</h4>
                                    <span className="text-xs text-slate-400">{p.gender} {p.age}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">UA: <span className="font-bold text-slate-800">{p.ua}</span> • {p.lastVisit}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <Chip label={p.label} status={p.status as any} />
                            {p.alerts.length > 0 && <AlertTriangle size={14} className="text-red-500" />}
                        </div>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    );
};

const DoctorEditRecord = ({ recordId, onBack }: { recordId: string | null, onBack: () => void }) => {
    // If recordId exists, find it, otherwise start fresh
    const existing = recordId ? getRecordById(recordId) : null;
    
    const [form, setForm] = useState<Omit<MedicalRecord, 'id'>>(existing || {
        date: new Date().toISOString().split('T')[0],
        type: '复诊',
        title: '',
        desc: '',
        doctor: '李医生',
        tag: ''
    });

    const handleSave = () => {
        if (!form.title || !form.desc) {
            alert("请填写完整信息");
            return;
        }

        if (recordId) {
            // Update
            updateRecord({ ...form, id: recordId });
        } else {
            // Create
            addRecord({ ...form, id: Date.now().toString() });
        }
        onBack();
    };

    const handleDelete = () => {
        if (window.confirm("确定要删除这条病历吗？")) {
            if (recordId) {
                deleteRecord(recordId);
            }
            onBack();
        }
    }

    return (
        <ScrollArea className="px-5 pt-2 bg-slate-50">
            <AppHeader 
                title={recordId ? "编辑病历" : "新建病历"} 
                onBack={onBack} 
                transparent 
                right={recordId && (
                    <button onClick={handleDelete} className="p-2 text-red-500 bg-red-50 rounded-full hover:bg-red-100 transition-colors">
                        <Trash2 size={18} />
                    </button>
                )}
            />
            
            <div className="space-y-5 mt-2 pb-24">
                <Card>
                    <SectionHeader title="基础信息" className="mt-0 mb-3" />
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">就诊日期</label>
                            <input 
                                type="date" 
                                value={form.date}
                                onChange={e => setForm({...form, date: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">就诊类型</label>
                            <div className="flex gap-2">
                                {['初诊', '复诊', '急诊', '住院'].map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => setForm({...form, type: t as any})}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                                            form.type === t 
                                            ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm' 
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">主治医生</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    value={form.doctor}
                                    onChange={e => setForm({...form, doctor: e.target.value})}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-teal-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <SectionHeader title="诊断详情" className="mt-0 mb-3" />
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">诊断标题</label>
                            <input 
                                type="text" 
                                placeholder="如：痛风性关节炎急性发作"
                                value={form.title}
                                onChange={e => setForm({...form, title: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-teal-500 transition-all placeholder:font-normal"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">病情描述 / 医嘱</label>
                            <textarea 
                                rows={6}
                                placeholder="在此输入详细的病情描述、检查结果摘要及处理意见..."
                                value={form.desc}
                                onChange={e => setForm({...form, desc: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed outline-none focus:border-teal-500 transition-all resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">标签 (可选)</label>
                            <input 
                                type="text" 
                                placeholder="如：急性期"
                                value={form.tag || ''}
                                onChange={e => setForm({...form, tag: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500 transition-all"
                            />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 z-50 flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={onBack}>取消</Button>
                <Button variant="primary" className="flex-[2] shadow-xl shadow-teal-500/20" onClick={handleSave}>
                    <Save size={18} /> 保存病历
                </Button>
            </div>
        </ScrollArea>
    );
}

const DoctorMedicalRecord = ({ id, onBack, onEdit }: { id: string, onBack: () => void, onEdit: (recordId: string | null) => void }) => {
    const patient = PATIENTS_LIST.find(p => p.id === id) || PATIENTS_LIST[0];
    const [activeSection, setActiveSection] = useState('timeline');
    // Force re-render ensures we get the latest data from the store when this component is mounted
    const records = getRecords(); 

    return (
        <ScrollArea className="px-5 pt-2 bg-[#F2F4F7]">
            <AppHeader 
                title="健康档案" 
                onBack={onBack} 
                transparent 
            />
            
            {/* Header Card */}
            <Card className="mb-6 bg-white border-l-4 border-l-teal-500">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">{patient.name}</h2>
                        <p className="text-sm text-slate-500">ID: 88219 • {patient.gender} • {patient.age}岁</p>
                    </div>
                    <div className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-bold">
                        门诊病历
                    </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-xs text-slate-400 font-bold uppercase block mb-1">主要诊断</span>
                        <span className="text-sm font-bold text-slate-800">痛风性关节炎 (急性期)</span>
                    </div>
                    <div>
                        <span className="text-xs text-slate-400 font-bold uppercase block mb-1">过敏史</span>
                        <div className="flex items-center gap-1">
                            <AlertCircle size={12} className="text-red-500" />
                            <span className="text-sm font-medium text-red-600">磺胺类药物</span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Toggle */}
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 mb-6 flex">
                <button 
                    onClick={() => setActiveSection('timeline')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeSection === 'timeline' ? 'bg-teal-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Clock size={14} /> 诊疗记录
                </button>
                <button 
                    onClick={() => setActiveSection('reports')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeSection === 'reports' ? 'bg-teal-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Clipboard size={14} /> 检查报告
                </button>
            </div>

            {/* Content Area */}
            {activeSection === 'timeline' ? (
                <div className="relative pl-4 space-y-6 pb-8">
                    
                    <Button fullWidth className="mb-6 shadow-md shadow-teal-500/10 bg-teal-600 hover:bg-teal-700" onClick={() => onEdit(null)}>
                        <Plus size={18} /> 新建病历
                    </Button>

                    {/* Timeline Line */}
                    <div className="absolute left-[21px] top-16 bottom-0 w-0.5 bg-slate-200"></div>

                    {records.map((event, idx) => (
                        <div key={event.id} className="relative pl-8 group animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                            {/* Dot */}
                            <div className="absolute left-0 top-1.5 w-[14px] h-[14px] rounded-full border-2 border-white bg-teal-500 shadow-sm z-10"></div>
                            
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900">{event.date}</span>
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-medium">{event.type}</span>
                                    {event.tag && <span className="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-bold">{event.tag}</span>}
                                </div>
                            </div>
                            
                            <Card className="p-4 relative hover:border-teal-200 transition-colors border border-slate-100 shadow-sm">
                                <div className="absolute top-3 right-3">
                                    <button 
                                        onClick={() => onEdit(event.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-full hover:bg-teal-50 hover:text-teal-600 transition-all border border-slate-100"
                                    >
                                        <Edit3 size={12} /> 编辑
                                    </button>
                                </div>
                                
                                <h3 className="font-bold text-slate-800 text-sm mb-2 pr-16">{event.title}</h3>
                                <p className="text-xs text-slate-600 leading-relaxed mb-3 whitespace-pre-wrap">{event.desc}</p>
                                <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                                    <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center">
                                        <Stethoscope size={12} className="text-indigo-600" />
                                    </div>
                                    <span className="text-xs text-slate-500 font-medium">{event.doctor}</span>
                                </div>
                            </Card>
                        </div>
                    ))}
                    
                    {records.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-sm">暂无病历记录，点击上方按钮添加</div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 pb-8">
                    {[
                        { title: '生化全项检查', date: '2024-05-15', type: 'Lab', icon: Microscope, color: 'text-blue-500', bg: 'bg-blue-50' },
                        { title: '关节超声波', date: '2024-04-02', type: 'Img', icon: ImageIcon, color: 'text-purple-500', bg: 'bg-purple-50' },
                        { title: '尿常规分析', date: '2024-04-02', type: 'Lab', icon: Microscope, color: 'text-blue-500', bg: 'bg-blue-50' },
                        { title: '足部X光片', date: '2024-01-10', type: 'Img', icon: ImageIcon, color: 'text-purple-500', bg: 'bg-purple-50' },
                    ].map((report, idx) => (
                        <Card key={idx} className="flex flex-col items-center justify-center p-4 text-center aspect-[4/5] hover:border-teal-200 transition-colors cursor-pointer">
                            <div className={`w-12 h-12 rounded-2xl ${report.bg} flex items-center justify-center mb-3`}>
                                <report.icon size={24} className={report.color} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1">{report.title}</h3>
                            <p className="text-[10px] text-slate-400 mb-3">{report.date}</p>
                            <Button size="sm" variant="secondary" className="h-7 text-[10px] px-3 w-full">
                                查看详情
                            </Button>
                        </Card>
                    ))}
                </div>
            )}
        </ScrollArea>
    );
};

const DoctorPatientDetail = ({ id, onBack, onOpenRecord }: { id: string, onBack: () => void, onOpenRecord: (id: string) => void }) => {
    const [tab, setTab] = useState('概览');
    const patient = PATIENTS_LIST.find(p => p.id === id) || PATIENTS_LIST[0];

    return (
        <ScrollArea className="px-5 pt-2 bg-[#F2F4F7]">
            <AppHeader title="患者详情" onBack={onBack} transparent />
            
            <div className="bg-white rounded-3xl p-5 mb-6 shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4">
                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-2xl">
                            {patient.name[0]}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">{patient.name}</h2>
                            <p className="text-sm text-slate-500">{patient.gender} • {patient.age}岁 • ID: 88219</p>
                            <div className="flex gap-2 mt-2">
                                <Chip label={patient.label} status={patient.status as any} />
                                <Chip label="依从性良" status="Safe" />
                            </div>
                        </div>
                    </div>
                    <Button variant="secondary" className="rounded-full p-3 h-auto"><MessageSquare size={20} /></Button>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-50">
                    <div className="text-center">
                        <div className="text-xs text-slate-400 uppercase font-bold">当前尿酸</div>
                        <div className="text-xl font-bold text-slate-900">{patient.ua}</div>
                    </div>
                    <div className="text-center border-l border-slate-100">
                        <div className="text-xs text-slate-400 uppercase font-bold">目标值</div>
                        <div className="text-xl font-bold text-teal-600">360</div>
                    </div>
                    <div className="text-center border-l border-slate-100">
                        <div className="text-xs text-slate-400 uppercase font-bold">BMI</div>
                        <div className="text-xl font-bold text-slate-900">26.5</div>
                    </div>
                </div>
            </div>

            <SegmentedControl options={['概览', '趋势', '用药', '档案']} selected={tab} onChange={setTab} />

            <div className="mt-6">
                <Card className="mb-4">
                    <h3 className="font-bold text-slate-800 mb-4 text-sm">尿酸控制趋势</h3>
                    <div className="h-48 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[{n:'1',v:520}, {n:'2',v:480}, {n:'3',v:450}, {n:'4',v:460}, {n:'5',v:420}]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="n" hide />
                                <YAxis hide domain={['dataMin - 50', 'dataMax + 50']} />
                                <Tooltip />
                                <Line type="monotone" dataKey="v" stroke="#0d9488" strokeWidth={3} dot={{r:4}} />
                            </LineChart>
                         </ResponsiveContainer>
                    </div>
                </Card>

                <SectionHeader title="当前用药" />
                <Card className="flex justify-between items-center py-4 mb-2">
                    <div>
                        <div className="font-bold text-slate-800">非布司他片</div>
                        <div className="text-xs text-slate-500">40mg • 每日一次</div>
                    </div>
                    <Chip label="坚持服用" status="Safe" />
                </Card>
                
                <Button fullWidth variant="outline" onClick={() => onOpenRecord(id)} className="mt-6 border-slate-300 text-slate-600">
                    <FileText size={16} className="mr-2" /> 查看健康档案
                </Button>
            </div>
        </ScrollArea>
    );
}

const DoctorAlerts = ({ onBack }: { onBack: () => void }) => {
    return (
        <ScrollArea className="px-5 pt-2">
            <AppHeader title="高危预警" onBack={onBack} transparent />
            
            <div className="space-y-3">
                {PATIENTS_LIST.filter(p => p.status === 'Critical' || p.status === 'High').map((p, i) => (
                    <Card key={i} className="border-l-4 border-l-red-500">
                        <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-2">
                                 <h3 className="font-bold text-slate-900">{p.name}</h3>
                                 <Chip label={p.label} status={p.status as any} />
                             </div>
                             <span className="text-xs text-slate-400">刚刚</span>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg mb-3">
                            <p className="text-xs text-red-700 font-medium flex items-center gap-2">
                                <AlertTriangle size={14} />
                                {p.alerts[0] || '尿酸严重超标'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" fullWidth>联系患者</Button>
                            <Button size="sm" variant="secondary" fullWidth>查看详情</Button>
                        </div>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    )
}

const DoctorChatList = () => {
    return (
        <ScrollArea className="px-5 pt-2">
            <AppHeader title="消息" transparent />
            <div className="space-y-1">
                {PATIENTS_LIST.map((p, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl active:bg-slate-50 transition-colors border border-slate-100 mb-2">
                         <div className="relative">
                            <div className="h-12 w-12 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500">{p.name[0]}</div>
                            {i === 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>}
                         </div>
                         <div className="flex-1 overflow-hidden">
                             <div className="flex justify-between items-center mb-1">
                                 <h4 className="font-bold text-slate-900">{p.name}</h4>
                                 <span className="text-[10px] text-slate-400">10:30</span>
                             </div>
                             <p className="text-xs text-slate-500 truncate">{i === 0 ? '李医生，我最近脚踝有点肿...' : '谢谢医生，我会按时吃药的。'}</p>
                         </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    )
}

// --- Main ---

export const DoctorApp = ({ onSwitchRole }: { onSwitchRole: () => void }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const tabs = [
    { id: 'home', label: '工作台', icon: CheckSquare },
    { id: 'patients', label: '患者', icon: Users },
    { id: 'messages', label: '消息', icon: MessageSquare },
    { id: 'me', label: '我的', icon: User },
  ];

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setCurrentScreen(id);
  };

  const handlePatientSelect = (id: string) => {
      setSelectedPatientId(id);
      setCurrentScreen('patient-detail');
  };

  const handleEditRecord = (recordId: string | null) => {
      setEditingRecordId(recordId);
      setCurrentScreen('edit-record');
  }

  const renderScreen = () => {
      switch(currentScreen) {
          case 'home': return <DoctorHome onNavigate={setCurrentScreen} />;
          case 'patients': return <DoctorPatientList onSelectPatient={handlePatientSelect} />;
          case 'patient-detail': 
            return (
                <DoctorPatientDetail 
                    id={selectedPatientId!} 
                    onBack={() => setCurrentScreen('patients')} 
                    onOpenRecord={(id) => setCurrentScreen('record')}
                />
            );
          case 'record': 
            return (
                <DoctorMedicalRecord 
                    id={selectedPatientId!} 
                    onBack={() => setCurrentScreen('patient-detail')}
                    onEdit={handleEditRecord} 
                />
            );
          case 'edit-record':
            return (
                <DoctorEditRecord 
                    recordId={editingRecordId} 
                    onBack={() => setCurrentScreen('record')} 
                />
            );
          case 'alerts': return <DoctorAlerts onBack={() => setCurrentScreen('home')} />;
          case 'messages': return <DoctorChatList />;
          case 'me': 
             return (
                 <ScrollArea className="px-5 pt-2">
                     <AppHeader title="个人中心" transparent />
                     <Card className="mb-6 flex items-center gap-4 p-5">
                         <div className="h-16 w-16 bg-slate-200 rounded-full flex items-center justify-center text-2xl font-bold text-slate-500">
                             李
                         </div>
                         <div>
                             <h2 className="text-xl font-bold text-slate-900">李医生</h2>
                             <p className="text-sm text-slate-500">风湿免疫科 • 主任医师</p>
                         </div>
                     </Card>
                     
                     <div className="space-y-3">
                        <Card className="flex justify-between items-center py-4">
                            <span className="font-bold text-slate-700">我的排班</span>
                            <ChevronRight size={18} className="text-slate-300" />
                        </Card>
                         <Card className="flex justify-between items-center py-4">
                            <span className="font-bold text-slate-700">患者评价</span>
                            <ChevronRight size={18} className="text-slate-300" />
                        </Card>
                        <Card className="flex justify-between items-center py-4">
                            <span className="font-bold text-slate-700">设置</span>
                            <ChevronRight size={18} className="text-slate-300" />
                        </Card>
                     </div>
                     
                     <div className="mt-8 bg-red-50 rounded-2xl p-6 border border-red-100">
                        <h3 className="text-lg font-bold text-red-800 mb-2">账户切换</h3>
                        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                            清空当前登录信息，重新选择医生/非医生账号
                        </p>
                        <button 
                            onClick={onSwitchRole}
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all"
                        >
                            切换/退出登陆
                        </button>
                    </div>
                 </ScrollArea>
             );
          default: return <DoctorHome onNavigate={setCurrentScreen} />;
      }
  }

  return (
    <AppContainer>
      {renderScreen()}
      {['home', 'patients', 'messages', 'me'].includes(currentScreen) && (
          <BottomNav tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
      )}
    </AppContainer>
  );
};