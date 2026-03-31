import React, { useState, useEffect } from 'react';
import { ChevronRight, User, Save, ArrowLeft, FileText, Pill } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

const PatientForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({
    gender: 'Male',
    status: 'Stable',
    targetUricAcid: 360,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const showFeedback = (type: 'error' | 'success', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(() => {
    if (id) {
      const fetchPatient = async () => {
        try {
          setLoading(true);
          const data = await api.getPatient(id);
          setFormData(data);
        } catch (error) {
          console.error('Failed to fetch patient:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchPatient();
    }
  }, [id]);

  const handleSave = async () => {
    if (!formData.nickName && !formData.name) {
      showFeedback('error', '请输入患者姓名');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        nickName: formData.nickName,
        age: formData.age,
        gender: formData.gender,
        diagnosis: formData.diagnosis,
        status: formData.status,
        targetUricAcid: formData.targetUricAcid,
        medication: formData.medication,
      };
      if (id) {
        await api.updatePatient(id, payload);
      } else {
        await api.createPatient(payload);
      }
      navigate('/patients');
    } catch (error) {
      console.error('Failed to save patient:', error);
      showFeedback('error', '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">加载中...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 min-h-[600px] flex flex-col animate-fade-in">
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          feedback.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {feedback.text}
        </div>
      )}
      {/* Breadcrumb / Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
        <div className="flex items-center text-sm text-slate-500">
          <span className="hover:text-primary-600 cursor-pointer" onClick={() => navigate('/patients')}>
            患者列表
          </span>
          <ChevronRight size={14} className="mx-2 text-slate-300" />
          <span className="font-bold text-slate-800">{id ? '编辑档案' : '新建档案'}</span>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 p-8 md:px-12 md:py-10">
        <div className="max-w-4xl mx-auto space-y-10">
          
          {/* Section 1: Basic Info */}
          <div>
            <h3 className="flex items-center text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-50">
              <User size={20} className="mr-2 text-primary-600" />
              基本信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">患者姓名</label>
                <input 
                  type="text" 
                  value={formData.nickName || formData.name || ''}
                  onChange={e => setFormData({...formData, nickName: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">年龄</label>
                <input 
                  type="number" 
                  value={formData.age || ''}
                  onChange={e => setFormData({...formData, age: parseInt(e.target.value)})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">性别</label>
                <select 
                  value={formData.gender || 'Male'}
                  onChange={e => setFormData({...formData, gender: e.target.value as 'Male' | 'Female'})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Male">男</option>
                  <option value="Female">女</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Info */}
          <div>
            <h3 className="flex items-center text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-50">
              <FileText size={20} className="mr-2 text-primary-600" />
              临床诊断
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">主要诊断</label>
                <input 
                  type="text" 
                  value={formData.diagnosis || ''}
                  onChange={e => setFormData({...formData, diagnosis: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">当前状态</label>
                <select 
                  value={formData.status || 'Stable'}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Stable">病情稳定 (Stable)</option>
                  <option value="Risk">未达标/风险 (Risk)</option>
                  <option value="Critical">急性发作/危急 (Critical)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">目标尿酸值 (μmol/L)</label>
                <input 
                  type="number" 
                  value={formData.targetUricAcid || ''}
                  onChange={e => setFormData({...formData, targetUricAcid: parseInt(e.target.value)})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Medication */}
          <div>
            <h3 className="flex items-center text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-50">
              <Pill size={20} className="mr-2 text-primary-600" />
              治疗方案
            </h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">当前用药方案</label>
              <textarea 
                value={formData.medication || ''}
                onChange={e => setFormData({...formData, medication: e.target.value})}
                rows={4}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              ></textarea>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 flex gap-4">
            <button 
              onClick={() => navigate('/patients')}
              disabled={saving}
              className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm flex items-center disabled:opacity-50"
            >
              <Save size={18} className="mr-2" />
              {saving ? '保存中...' : '保存档案'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PatientForm;