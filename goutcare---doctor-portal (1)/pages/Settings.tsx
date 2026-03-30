import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, Activity, Save, Mail, Smartphone } from 'lucide-react';
import { api } from '../api';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    nickName: '',
    title: '',
    department: '',
    licenseNo: '',
    hospital: '',
    avatar: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.getMe();
        setProfile({
          nickName: data.nickName || '',
          title: data.title || '',
          department: data.department || '',
          licenseNo: data.licenseNo || '',
          hospital: data.hospital || '',
          avatar: data.avatar || ''
        });
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleProfileSave = async () => {
    try {
      setSaving(true);
      await api.updateProfile(profile);
      alert('保存成功');
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Mock form states
  const [notifications, setNotifications] = useState({
    emailCritical: true,
    emailDaily: false,
    smsCritical: true,
  });

  const [clinical, setClinical] = useState({
    defaultTarget: '360',
  });

  const tabs = [
    { id: 'profile', label: '个人资料', icon: User },
    { id: 'clinical', label: '诊疗偏好', icon: Activity },
    { id: 'notification', label: '通知消息', icon: Bell },
    { id: 'security', label: '账号安全', icon: Shield },
  ];

  if (loading) return <div className="p-8 text-center text-slate-500">加载中...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="md:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-fit">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800">系统设置</h3>
        </div>
        <nav className="p-2 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                activeTab === tab.id 
                  ? 'bg-primary-50 text-primary-600' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[600px]">
        
        {/* Profile Settings */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-slate-800 mb-6">个人资料</h2>
            
            <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
              <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-md">
                 <img src={profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.nickName || '医生')}&background=0D8ABC&color=fff&size=128`} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  更换头像
                </button>
                <p className="text-xs text-slate-400 mt-2">支持 JPG, PNG 格式，最大 2MB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">姓名</label>
                <input type="text" value={profile.nickName} onChange={e => setProfile({...profile, nickName: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">所属医院</label>
                <input type="text" value={profile.hospital} onChange={e => setProfile({...profile, hospital: e.target.value})} placeholder="例如：南方医科大学珠江医院" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">职称</label>
                <input type="text" value={profile.title} onChange={e => setProfile({...profile, title: e.target.value})} placeholder="例如：副主任医师" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">所属科室</label>
                <input type="text" value={profile.department} onChange={e => setProfile({...profile, department: e.target.value})} placeholder="例如：风湿免疫科" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">执业证号</label>
                <input type="text" value={profile.licenseNo} onChange={e => setProfile({...profile, licenseNo: e.target.value})} placeholder="请输入执业证号" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button onClick={handleProfileSave} disabled={saving} className="flex items-center px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
                <Save size={18} className="mr-2" />
                {saving ? '保存中...' : '保存更改'}
              </button>
            </div>
          </div>
        )}

        {/* Clinical Preferences */}
        {activeTab === 'clinical' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-slate-800 mb-6">诊疗偏好设置</h2>
            
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-6">
              <h4 className="font-bold text-blue-800 text-sm mb-1">CDSS 辅助说明</h4>
              <p className="text-xs text-blue-600">在此设置您的默认诊疗目标值，系统将依据此标准自动标记患者状态异常。</p>
            </div>

            <div className="space-y-6">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-3">默认血尿酸达标值</label>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${clinical.defaultTarget === '360' ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-slate-200 hover:border-slate-300'}`}>
                     <div>
                       <span className="font-bold text-slate-800 block">360 μmol/L</span>
                       <span className="text-xs text-slate-500">通用标准 (无痛风石)</span>
                     </div>
                     <input type="radio" name="target" checked={clinical.defaultTarget === '360'} onChange={() => setClinical({...clinical, defaultTarget: '360'})} className="w-5 h-5 text-primary-600 focus:ring-primary-500" />
                   </label>
                   
                   <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${clinical.defaultTarget === '300' ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-slate-200 hover:border-slate-300'}`}>
                     <div>
                       <span className="font-bold text-slate-800 block">300 μmol/L</span>
                       <span className="text-xs text-slate-500">严格标准 (有痛风石)</span>
                     </div>
                     <input type="radio" name="target" checked={clinical.defaultTarget === '300'} onChange={() => setClinical({...clinical, defaultTarget: '300'})} className="w-5 h-5 text-primary-600 focus:ring-primary-500" />
                   </label>
                 </div>
               </div>

               <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="block text-sm font-medium text-slate-700">自动随访提醒</span>
                      <span className="text-xs text-slate-500">当患者尿酸连续 2 次超标时，自动加入待随访列表</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
               </div>
            </div>
            
            <div className="pt-4 flex justify-end">
              <button className="flex items-center px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm">
                <Save size={18} className="mr-2" />
                应用设置
              </button>
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeTab === 'notification' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-slate-800 mb-6">消息通知</h2>

            <div className="space-y-4">
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-white rounded-lg text-red-500 shadow-sm"><Activity size={20} /></div>
                   <div>
                     <span className="block font-bold text-slate-800 text-sm">危急值预警 (邮件)</span>
                     <span className="text-xs text-slate-500">当管理患者出现急性发作上报时立即通知</span>
                   </div>
                 </div>
                 <input type="checkbox" checked={notifications.emailCritical} onChange={() => setNotifications(p => ({...p, emailCritical: !p.emailCritical}))} className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 border-gray-300" />
               </div>

               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-white rounded-lg text-blue-500 shadow-sm"><Mail size={20} /></div>
                   <div>
                     <span className="block font-bold text-slate-800 text-sm">每日晨报 (邮件)</span>
                     <span className="text-xs text-slate-500">每天早上 8:00 发送昨日患者数据概览</span>
                   </div>
                 </div>
                 <input type="checkbox" checked={notifications.emailDaily} onChange={() => setNotifications(p => ({...p, emailDaily: !p.emailDaily}))} className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 border-gray-300" />
               </div>

               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-white rounded-lg text-indigo-500 shadow-sm"><Smartphone size={20} /></div>
                   <div>
                     <span className="block font-bold text-slate-800 text-sm">短信通知</span>
                     <span className="text-xs text-slate-500">接收重要的系统公告和验证码</span>
                   </div>
                 </div>
                 <input type="checkbox" checked={notifications.smsCritical} onChange={() => setNotifications(p => ({...p, smsCritical: !p.smsCritical}))} className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 border-gray-300" />
               </div>
            </div>
          </div>
        )}

        {/* Security */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-fade-in">
             <h2 className="text-xl font-bold text-slate-800 mb-6">账号安全</h2>

             <form className="space-y-4 max-w-md">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">当前密码</label>
                 <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">新密码</label>
                 <input type="password" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">确认新密码</label>
                 <input type="password" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
               </div>
               
               <button className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-sm mt-2">
                 更新密码
               </button>
             </form>

             <div className="pt-8 border-t border-slate-100">
               <h3 className="font-bold text-slate-800 mb-4">登录历史</h3>
               <div className="text-sm text-slate-600 space-y-3">
                 <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                   <span>Windows 10 · Chrome</span>
                   <span className="text-slate-400">2024-03-24 08:30 (当前)</span>
                 </div>
                 <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                   <span>iPhone 14 · App</span>
                   <span className="text-slate-400">2024-03-23 19:12</span>
                 </div>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;