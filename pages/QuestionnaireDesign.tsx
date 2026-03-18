import React from 'react';
import { Plus, Search, Edit2, Copy, Trash2, FileText, CheckCircle2, Clock } from 'lucide-react';
import { MOCK_QUESTIONNAIRES } from '../constants';

const QuestionnaireDesign: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button className="flex items-center justify-center px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium shadow-sm shadow-primary-500/30 transition-colors whitespace-nowrap">
            <Plus size={18} className="mr-2" />
            新建问卷
          </button>
          <div className="text-sm text-slate-500 hidden md:block">
            共 {MOCK_QUESTIONNAIRES.length} 个问卷模板
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="搜索问卷标题..." 
               className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
             />
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_QUESTIONNAIRES.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${item.type === 'Scale' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                  <FileText size={24} />
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                  item.status === 'Published' 
                    ? 'bg-green-50 text-green-700 border-green-100' 
                    : 'bg-slate-50 text-slate-500 border-slate-100'
                }`}>
                  {item.status === 'Published' ? '已发布' : '草稿'}
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors cursor-pointer">
                {item.title}
              </h3>
              
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                <span>{item.questionCount} 道题目</span>
                <span>•</span>
                <span>{item.type === 'Scale' ? '量表评分' : '普通调查'}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-50">
                <div className="flex items-center">
                  <Clock size={14} className="mr-1" />
                  {item.updateDate} 更新
                </div>
                <div className="flex items-center">
                  <CheckCircle2 size={14} className="mr-1" />
                  {item.usageCount} 次使用
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="bg-slate-50 px-6 py-3 flex justify-between items-center border-t border-slate-100">
               <button className="text-slate-500 hover:text-primary-600 text-xs font-medium flex items-center transition-colors">
                 <Edit2 size={14} className="mr-1" /> 编辑
               </button>
               <button className="text-slate-500 hover:text-primary-600 text-xs font-medium flex items-center transition-colors">
                 <Copy size={14} className="mr-1" /> 复制
               </button>
               <button className="text-slate-400 hover:text-red-600 text-xs font-medium flex items-center transition-colors">
                 <Trash2 size={14} className="mr-1" /> 删除
               </button>
            </div>
          </div>
        ))}

        {/* Create New Card Placeholder */}
        <button className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all min-h-[200px]">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-white">
            <Plus size={24} />
          </div>
          <span className="font-medium">创建新问卷</span>
        </button>
      </div>
    </div>
  );
};

export default QuestionnaireDesign;