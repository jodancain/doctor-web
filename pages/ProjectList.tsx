import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MOCK_PROJECTS } from '../constants';

const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'mine' | 'all'>('all');

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'Recruiting': return '进行中';
      case 'Pending': return '设计中';
      case 'Completed': return '已结束';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-6 w-full xl:w-auto">
          <button 
            onClick={() => navigate('/projects/new')}
            className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium shadow-sm transition-colors whitespace-nowrap text-sm"
          >
            <Plus size={16} className="mr-1" />
            新建项目
          </button>

          <div className="flex items-center text-sm text-slate-600">
             <span className="mr-3 text-slate-500 font-medium">显示:</span>
             <div className="flex rounded overflow-hidden border border-slate-200">
               <button 
                 onClick={() => setFilter('mine')}
                 className={`px-4 py-1.5 transition-colors ${filter === 'mine' ? 'bg-success text-white' : 'bg-white hover:bg-slate-50 text-slate-600'}`}
               >
                 只看我的
               </button>
               <button 
                 onClick={() => setFilter('all')}
                 className={`px-4 py-1.5 transition-colors ${filter === 'all' ? 'bg-success text-white' : 'bg-white hover:bg-slate-50 text-slate-600'}`}
               >
                 全部数据
               </button>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full xl:w-auto">
          <select className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-600 outline-none focus:border-primary-500 min-w-[120px]">
            <option>请选择</option>
            <option>进行中</option>
            <option>设计中</option>
          </select>
          <div className="relative flex-1 xl:w-64">
             <input 
               type="text" 
               placeholder="请输入项目名称" 
               className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none focus:border-primary-500"
             />
          </div>
          <button className="px-5 py-2 bg-primary-500 text-white rounded-md text-sm hover:bg-primary-600 transition-colors whitespace-nowrap">
            查询
          </button>
          <button className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-md text-sm hover:bg-slate-50 transition-colors whitespace-nowrap">
            重置
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div className="bg-white rounded-t-xl border border-slate-100 border-b-0 overflow-hidden">
         <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 text-sm font-bold text-slate-500 text-center border-b border-slate-100">
           <div className="col-span-12 md:col-span-3 text-left pl-4">项目名称</div>
           <div className="col-span-6 md:col-span-2">状态</div>
           <div className="col-span-12 md:col-span-3">项目进度</div>
           <div className="col-span-6 md:col-span-2">项目周期</div>
           <div className="col-span-12 md:col-span-2">创建时间</div>
         </div>

         {/* List Items */}
         <div className="divide-y divide-slate-50">
           {MOCK_PROJECTS.map((project) => {
             const percent = Math.round((project.enrolledCount / project.targetCount) * 100);
             
             return (
               <div key={project.id} className="grid grid-cols-12 gap-4 p-6 items-center text-center text-sm hover:bg-slate-50 transition-colors group">
                 
                 {/* Name */}
                 <div className="col-span-12 md:col-span-3 text-left pl-4">
                   <div className="font-medium text-slate-600 group-hover:text-primary-600 transition-colors cursor-pointer truncate" title={project.name}>
                     {project.name}
                   </div>
                 </div>

                 {/* Status */}
                 <div className="col-span-6 md:col-span-2">
                   <span className={`inline-block w-20 py-1 rounded text-xs ${
                     project.status === 'Recruiting' ? 'text-slate-600' : 'text-slate-500'
                   }`}>
                     {getStatusLabel(project.status)}
                   </span>
                 </div>

                 {/* Progress */}
                 <div className="col-span-12 md:col-span-3 text-left">
                   <div className="max-w-[240px] mx-auto md:mx-0">
                     <div className="text-xs text-slate-500 mb-2">目标人数{project.targetCount}人</div>
                     <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                       <div 
                         style={{width: `${percent}%`}} 
                         className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
                       ></div>
                     </div>
                     <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-normal text-slate-600">{percent}%</span>
                       <span className="text-xs text-slate-500">已入组{project.enrolledCount}人</span>
                     </div>
                   </div>
                 </div>

                 {/* Period */}
                 <div className="col-span-6 md:col-span-2 text-slate-600">
                   {project.periodValue}{project.periodUnit}
                 </div>

                 {/* Date */}
                 <div className="col-span-12 md:col-span-2 text-slate-500 text-xs">
                   {project.createDate}
                 </div>

               </div>
             );
           })}
         </div>
      </div>

      {/* Pagination (Mock) */}
      <div className="flex justify-end pt-4">
         <div className="flex gap-2">
           <button className="px-3 py-1 bg-white border border-slate-200 rounded text-slate-400 text-xs disabled:opacity-50" disabled>上一页</button>
           <button className="px-3 py-1 bg-primary-600 text-white border border-primary-600 rounded text-xs">1</button>
           <button className="px-3 py-1 bg-white border border-slate-200 rounded text-slate-600 text-xs hover:bg-slate-50">2</button>
           <button className="px-3 py-1 bg-white border border-slate-200 rounded text-slate-600 text-xs hover:bg-slate-50">下一页</button>
         </div>
      </div>
    </div>
  );
};

export default ProjectList;