import React, { useState } from 'react';
import { Plus, Camera, Save } from 'lucide-react';

const Records: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'uric' | 'attack' | 'meds'>('uric');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex p-1 bg-white rounded-xl shadow-sm border border-slate-100 mb-6">
        <button
          onClick={() => setActiveTab('uric')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'uric' ? 'bg-primary-50 text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          记录尿酸
        </button>
        <button
          onClick={() => setActiveTab('attack')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'attack' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          记录发作
        </button>
        <button
          onClick={() => setActiveTab('meds')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'meds' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          用药打卡
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        {activeTab === 'uric' && (
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">测量日期</label>
              <input type="date" className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">血尿酸值 (μmol/L)</label>
              <div className="relative">
                <input type="number" placeholder="请输入数值，如 420" className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none" />
                <span className="absolute right-4 top-3.5 text-slate-400 text-sm">μmol/L</span>
              </div>
            </div>
            <div className="pt-4">
              <button type="button" className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
                <Save size={20} />
                保存记录
              </button>
            </div>
          </form>
        )}

        {activeTab === 'attack' && (
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">发作部位</label>
              <div className="flex gap-2 flex-wrap">
                {['大脚趾', '脚踝', '膝盖', '手指', '手肘'].map(part => (
                  <button key={part} type="button" className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-primary-500 hover:text-primary-600">
                    {part}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">疼痛程度 (1-10)</label>
              <input type="range" min="1" max="10" className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500" />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>轻微</span>
                <span>剧烈</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">可能诱因</label>
              <textarea placeholder="例如：昨晚吃了海鲜火锅，喝了啤酒..." className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none h-24"></textarea>
            </div>
            <div className="pt-4">
              <button type="button" className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                <Save size={20} />
                记录病情
              </button>
            </div>
          </form>
        )}

         {activeTab === 'meds' && (
          <div className="space-y-6 text-center py-10">
             <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera size={32} className="text-indigo-500" />
             </div>
             <h3 className="text-lg font-bold text-slate-800">拍照识别药盒/处方</h3>
             <p className="text-slate-500 text-sm max-w-xs mx-auto">
               拍摄您的药盒或门诊处方单，系统将自动识别药物名称和用法用量，生成提醒计划。
             </p>
             <button className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
               打开相机
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Records;
