import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, UserPlus, X, Copy, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const PatientList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;
  const navigate = useNavigate();

  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async (reset = false) => {
      try {
        setLoading(true);
        const currentOffset = reset ? 0 : offset;
        const res = await api.getPatients({ q: searchTerm, limit, offset: currentOffset });
        
        if (reset) {
          setPatients(res.items || []);
        } else {
          setPatients(prev => [...prev, ...(res.items || [])]);
        }
        
        setHasMore((res.items || []).length === limit);
        setOffset(currentOffset + limit);
      } catch (error) {
        console.error('Failed to fetch patients:', error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timer = setTimeout(() => {
      fetchPatients(true);
    }, 300);

  return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadMore = async () => {
    try {
      setLoadingMore(true);
      const res = await api.getPatients({ q: searchTerm, limit, offset });
      setPatients(prev => [...prev, ...(res.items || [])]);
      setHasMore((res.items || []).length === limit);
      setOffset(offset + limit);
    } catch (error) {
      console.error('Failed to fetch more patients:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (patientOpenid: string) => {
    // We shouldn't use window.confirm in iframe as it might not work well, but let's use it for simplicity unless we build a modal.
    // The instructions say: "IMPORTANT: Do NOT use confirm(), window.confirm(), alert() or window.alert() in the code. The code is running in an iframe and the user will NOT see the confirmation dialog or alerts. Instead, use custom modal UI for these."
    // Ah! I need to build a custom modal for delete confirmation.
    setPatientToDelete(patientOpenid);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="搜索患者姓名、ID..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium">
            <Filter size={18} className="mr-2" />
            筛选
          </button>
          <button 
            onClick={() => navigate('/patients/new')}
            className="flex items-center px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium shadow-sm shadow-primary-500/30"
          >
            <UserPlus size={18} className="mr-2" />
            新增患者
          </button>
          <button 
            onClick={() => setShowQRCode(true)}
            className="flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium"
          >
            二维码
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">患者信息</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">诊断/状态</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">当前尿酸</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">用药方案</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">最近就诊</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    加载中...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    暂无患者数据
                  </td>
                </tr>
              ) : patients.map((patient) => (
                <tr key={patient._id || patient.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
                        {(patient.nickName || patient.name || '未知').substring(0, 1)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{patient.nickName || patient.name}</div>
                        <div className="text-xs text-slate-500">{patient.gender === 'Male' ? '男' : '女'} · {patient.age || '--'}岁</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-800 font-medium">{patient.diagnosis || '痛风'}</div>
                    <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                      patient.status === 'Critical' ? 'bg-red-100 text-red-700' :
                      patient.status === 'Risk' ? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {patient.status === 'Critical' ? '近期发作' : 
                       patient.status === 'Risk' ? '未达标' : '稳定'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`font-bold text-lg ${
                      (patient.lastUricAcid || 0) > (patient.targetUricAcid || 360) ? 'text-red-600' : 'text-slate-800'
                    }`}>
                      {patient.lastUricAcid || '--'}
                    </div>
                    <div className="text-xs text-slate-400">目标: &lt;{patient.targetUricAcid || 360}</div>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate text-sm text-slate-600" title={patient.medication}>
                    {patient.medication || '--'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {patient.lastVisit || '--'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/patients/${patient._openid || patient.id}`)}
                        className="text-slate-400 hover:text-primary-600 p-2 hover:bg-primary-50 rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => navigate(`/patients/edit/${patient._openid || patient.id}`)}
                        className="text-slate-400 hover:text-primary-600 p-2 hover:bg-primary-50 rounded-lg transition-colors"
                        title="编辑档案"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(patient._openid || patient.id)}
                        className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除患者"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && hasMore && patients.length > 0 && (
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 text-sm font-medium text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? '加载中...' : '加载更多'}
            </button>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQRCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowQRCode(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[400px] overflow-hidden relative transform transition-all scale-100" onClick={e => e.stopPropagation()}>
             {/* Header */}
             <div className="flex justify-center pt-6 pb-2 relative">
               <h3 className="text-lg text-slate-600 font-normal">我的二维码</h3>
               <button 
                 onClick={() => setShowQRCode(false)}
                 className="absolute right-5 top-6 text-slate-400 hover:text-slate-600 transition-colors"
               >
                 <X size={20} />
               </button>
             </div>
             
             <div className="p-8">
               {/* Doctor Info Section */}
               <div className="flex items-center gap-6 mb-10">
                 <div className="w-[88px] h-[88px] rounded-full bg-slate-100 shrink-0 overflow-hidden shadow-sm border border-slate-50">
                    <img 
                      src="https://ui-avatars.com/api/?name=Dr+Wang&background=0D8ABC&color=fff&size=200" 
                      className="w-full h-full object-cover" 
                      alt="Avatar" 
                    />
                 </div>
                 <div className="space-y-1.5">
                   <h4 className="text-xl text-slate-700 font-normal">王主任</h4>
                   <p className="text-xs text-slate-500">副主任医师&nbsp;&nbsp;&nbsp;南方医科大学珠江医院</p>
                   <p className="text-xs text-slate-500">南方医科大学珠江医院</p>
                 </div>
               </div>
               
               {/* QR Code Section */}
               <div className="flex justify-center mb-6">
                 <div className="w-[220px] h-[220px] bg-slate-50">
                   {/* Generating a styled QR code similar to the image */}
                   <img 
                     src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https://goutcare.health/doctor/dr-wang&color=000000&bgcolor=ffffff&margin=5" 
                     alt="QR Code" 
                     className="w-full h-full mix-blend-multiply"
                   />
                 </div>
               </div>
               
               <p className="text-xs text-slate-500 text-center mb-8 tracking-wide">扫一扫，成为我的患者</p>
               
               <div className="flex justify-center">
                 <button 
                   onClick={handleCopy}
                   className="px-8 py-2 bg-primary-500 text-white rounded-md text-sm font-normal hover:bg-primary-600 transition-colors shadow-md shadow-primary-500/20 active:scale-95 duration-200"
                 >
                   {copied ? '已复制' : '复制二维码'}
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {patientToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">确认删除</h3>
            <p className="text-slate-600 mb-6">您确定要删除该患者吗？此操作不可恢复。</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setPatientToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                取消
              </button>
              <button 
                onClick={async () => {
                  try {
                    await api.deletePatient(patientToDelete);
                    setPatients(patients.filter(p => (p._openid || p.id) !== patientToDelete));
                    setPatientToDelete(null);
                  } catch (err) {
                    console.error('Failed to delete patient', err);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientList;