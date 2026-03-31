import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ArrowLeft, FileText, Activity, AlertCircle, Droplets, Dumbbell, Pill, Apple } from 'lucide-react';
import { api } from '../api';

const PatientDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ua');
  const [records, setRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        if (!id) return;
        setLoading(true);
        const [patientData, summaryData] = await Promise.all([
          api.getPatient(id),
          api.getPatientSummary(id)
        ]);
        setPatient(patientData);
        setSummary(summaryData);
      } catch (error) {
        console.error('Failed to fetch patient:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatientData();
  }, [id]);

  const fetchRecords = async (reset = false) => {
    if (!id) return;
    try {
      setRecordsLoading(true);
      const currentOffset = reset ? 0 : offset;
      const data = await api.getPatientRecords(id, activeTab, { limit, offset: currentOffset });
      
      const items = data.items || [];
      if (reset) {
        setRecords(items);
      } else {
        setRecords(prev => [...prev, ...items]);
      }

      setHasMore(items.length === limit);
      setOffset(currentOffset + limit);
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(true);
  }, [id, activeTab]);

  if (loading) return <div className="p-8 text-center text-slate-500">加载中...</div>;
  if (!patient) return <div className="p-8 text-center text-slate-500">未找到患者信息</div>;

  const tabs = [
    { id: 'ua', label: '尿酸记录', icon: Activity },
    { id: 'attack', label: '发作记录', icon: AlertCircle },
    { id: 'water', label: '饮水记录', icon: Droplets },
    { id: 'exercise', label: '运动记录', icon: Dumbbell },
    { id: 'medication', label: '用药记录', icon: Pill },
    { id: 'diet', label: '饮食记录', icon: Apple },
  ];

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '--';
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  const chartData = activeTab === 'ua' ? [...records].reverse().map(r => ({
    date: new Date(r.timestamp || r.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
    value: r.value
  })) : [];

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate('/patients')}
        className="flex items-center text-slate-500 hover:text-primary-600 transition-colors mb-2"
      >
        <ArrowLeft size={18} className="mr-1" /> 返回列表
      </button>

      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-2xl">
             {(patient.nickName || patient.name || '未知').substring(0, 1)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              {patient.nickName || patient.name}
            </h1>
            <p className="text-slate-500 mt-1">
              {patient.gender === 'Male' ? '男' : patient.gender === 'Female' ? '女' : patient.gender || '未知'} | {patient.age ? `${patient.age}岁` : '--'}
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-1">主要诊断</span>
            <span className="font-medium text-slate-800">{patient.diagnosis || '痛风'}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 max-w-[200px]">
            <span className="text-slate-400 block mb-1">当前用药</span>
            <span className="font-medium text-slate-800 truncate block" title={patient.medication || '暂无记录'}>{patient.medication || '暂无记录'}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-xs mb-1">最新尿酸</p>
            <p className="text-xl font-bold text-slate-800">{summary.latestUa || '--'} <span className="text-xs font-normal text-slate-500">μmol/L</span></p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-xs mb-1">近7天发作</p>
            <p className="text-xl font-bold text-slate-800">{summary.recentAttacks} <span className="text-xs font-normal text-slate-500">次</span></p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-xs mb-1">近7天饮水</p>
            <p className="text-xl font-bold text-slate-800">{summary.recentWaterTotal} <span className="text-xs font-normal text-slate-500">ml</span></p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-xs mb-1">近7天运动</p>
            <p className="text-xl font-bold text-slate-800">{summary.recentExerciseTotal} <span className="text-xs font-normal text-slate-500">分钟</span></p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-xs mb-1">近7天用药</p>
            <p className="text-xl font-bold text-slate-800">{summary.recentMedsCount} <span className="text-xs font-normal text-slate-500">次</span></p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'ua' && records.length > 0 && (
            <div className="mb-8 h-[300px]">
              <h3 className="text-sm font-bold text-slate-700 mb-4">尿酸趋势</h3>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-4">
            {records.length === 0 && !recordsLoading ? (
              <div className="text-center py-8 text-slate-500">暂无记录</div>
            ) : (
              records.map((record, index) => (
                <div key={record._id || index} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">{formatDate(record.timestamp || record.createdAt)}</p>
                    {activeTab === 'ua' && <p className="font-bold text-slate-800">{record.value} μmol/L</p>}
                    {activeTab === 'attack' && (
                      <div>
                        <p className="font-bold text-slate-800">部位: {record.joints?.join(', ') || '--'} | 疼痛: {record.painLevel}/10</p>
                        <p className="text-sm text-slate-600">诱因: {record.triggers?.join(', ') || '--'} | 持续: {record.duration || '--'}</p>
                      </div>
                    )}
                    {activeTab === 'water' && <p className="font-bold text-slate-800">{record.amount} ml</p>}
                    {activeTab === 'exercise' && <p className="font-bold text-slate-800">{record.type} - {record.duration} 分钟</p>}
                    {activeTab === 'medication' && <p className="font-bold text-slate-800">{record.name} {record.dosage} ({record.status})</p>}
                    {activeTab === 'diet' && (
                      <p className="font-bold text-slate-800 flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${
                          (record.color === 'green' || record.color === 'low' || record.purineLevel === 'low') ? 'bg-green-500' : 
                          (record.color === 'yellow' || record.color === 'medium' || record.purineLevel === 'medium') ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></span>
                        {record.name}
                      </p>
                    )}
                    {record.remark && <p className="text-sm text-slate-500 mt-1">备注: {record.remark}</p>}
                  </div>
                </div>
              ))
            )}
            
            {recordsLoading && <div className="text-center py-4 text-slate-500">加载中...</div>}
            
            {!recordsLoading && hasMore && records.length > 0 && (
              <button 
                onClick={() => fetchRecords()}
                className="w-full py-3 text-sm font-medium text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
              >
                加载更多
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;