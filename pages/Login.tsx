import React, { useState } from 'react';
import { ArrowRight, Activity } from 'lucide-react';
import { api } from '../api';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.login(username, password);
      onLogin();
    } catch (err: any) {
      setError(err.message || '登录失败，请检查账号和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
        {/* Header Section */}
        <div className="bg-primary-700 p-10 text-center relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
           <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-5 -mb-5"></div>
           
           <div className="relative z-10">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-white/20">
               <Activity size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-wide">GoutCare</h1>
            <p className="text-primary-100 text-sm mt-3 font-medium uppercase tracking-wider">医生端管理系统</p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-10">
           <form onSubmit={handleSubmit} className="space-y-6">
             {error && (
               <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
                 {error}
               </div>
             )}
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">工号 / 账号</label>
               <input 
                 type="text" 
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
                 className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none"
               />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">密码</label>
               <input 
                 type="password" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none"
               />
             </div>
             
             <div className="flex items-center justify-between mt-2">
               <label className="flex items-center cursor-pointer">
                 <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300" />
                 <span className="ml-2 text-sm text-slate-500">记住我（7 天免登录）</span>
               </label>
               <span className="text-sm text-slate-400">忘记密码请联系管理员</span>
             </div>

             <button 
               type="submit" 
               disabled={loading}
               className="w-full bg-primary-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary-700/30 hover:bg-primary-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
             >
               {loading ? '登录中...' : '登录系统'}
               {!loading && <ArrowRight size={20} />}
             </button>
           </form>

           <div className="mt-8 text-center border-t border-slate-100 pt-6">
             <p className="text-xs text-slate-400">
               技术支持: GoutCare Medical IT
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
