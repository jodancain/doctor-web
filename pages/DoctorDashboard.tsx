import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPatients: 0,
    criticalPatients: 0,
    riskPatients: 0,
    stablePatients: 0
  });
  const [alertPatients, setAlertPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, patientsData] = await Promise.all([
          api.getDashboardStats(),
          api.getPatients({ limit: 50 }) // Fetch more to find alerts
        ]);
        
        // Calculate real stats based on fetched patients
        const patients = patientsData.items || [];
        const critical = patients.filter((p: any) => p.status === 'Critical');
        const risk = patients.filter((p: any) => p.status === 'Risk');
        const stable = patients.filter((p: any) => p.status === 'Stable');
        
        setStats({
          totalPatients: statsData.totalPatients,
          criticalPatients: critical.length,
          riskPatients: risk.length,
          stablePatients: stable.length
        });
        
        setAlertPatients([...critical, ...risk].slice(0, 5)); // Show top 5 alerts
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const StatsCard = ({ title, value, subtext, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
          <p className={`text-xs mt-2 ${colorClass.text}`}>{subtext}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClass.bg} ${colorClass.text}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="p-8 text-center text-slate-500">加载中...</div>;

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="管理患者总数" 
          value={stats.totalPatients} 
          subtext="本月新增 +0 人" 
          icon={Users}
          colorClass={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
        />
        <StatsCard 
          title="急性发作/危急" 
          value={stats.criticalPatients} 
          subtext="需立即处理" 
          icon={AlertTriangle}
          colorClass={{ bg: 'bg-red-50', text: 'text-red-600' }}
        />
        <StatsCard 
          title="未达标/风险" 
          value={stats.riskPatients} 
          subtext="建议调整方案" 
          icon={TrendingUp}
          colorClass={{ bg: 'bg-orange-50', text: 'text-orange-600' }}
        />
        <StatsCard 
          title="已达标/稳定" 
          value={stats.stablePatients} 
          subtext="保持随访" 
          icon={CheckCircle2}
          colorClass={{ bg: 'bg-green-50', text: 'text-green-600' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Alerts List */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 text-lg">待办提醒 & 异常预警</h3>
            <button onClick={() => navigate('/patients')} className="text-sm text-primary-600 font-medium">查看全部</button>
          </div>
          <div className="space-y-4">
            {alertPatients.length === 0 ? (
              <div className="text-center text-slate-500 py-4">暂无异常预警</div>
            ) : (
              alertPatients.map(patient => (
                <div 
                  key={patient._id || patient.id} 
                  onClick={() => navigate(`/patients/${patient._openid || patient.id}`)}
                  className="flex items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className={`w-2 h-12 rounded-full mr-4 ${patient.status === 'Critical' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-slate-800">{patient.nickName || patient.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-500">{patient.age ? `${patient.age}岁` : '--'}</span>
                    </div>
                    <p className="text-sm text-slate-500">
                      最新尿酸 <span className="font-bold text-slate-700">{patient.lastUricAcid || '--'}</span> μmol/L 
                      <span className="mx-2">|</span>
                      目标 &lt; {patient.targetUricAcid || 360}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      patient.status === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {patient.status === 'Critical' ? '近期发作' : '未达标'}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">上次就诊: {patient.lastVisit || '--'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions / Schedule */}
        <div className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white">
          <h3 className="font-bold text-lg mb-4">今日门诊概览</h3>
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between bg-white/10 p-3 rounded-lg backdrop-blur-sm">
              <span>上午已预约</span>
              <span className="font-bold text-xl">0</span>
            </div>
            <div className="flex items-center justify-between bg-white/10 p-3 rounded-lg backdrop-blur-sm">
              <span>下午已预约</span>
              <span className="font-bold text-xl">0</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/patients')}
            className="w-full bg-white text-primary-600 py-3 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-colors"
          >
            开始接诊
          </button>
          <button
            onClick={() => navigate('/chat')}
            className="w-full mt-3 bg-primary-700 text-white py-3 rounded-xl font-bold border border-primary-500 hover:bg-primary-800 transition-colors"
          >
            群发随访消息
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
