import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MOCK_PROJECTS } from '../constants';
import { ResearchProject } from '../types';

const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'mine' | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('mock_projects');
    if (saved) {
      setProjects(JSON.parse(saved));
    } else {
      setProjects(MOCK_PROJECTS);
      localStorage.setItem('mock_projects', JSON.stringify(MOCK_PROJECTS));
    }
  }, []);

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'Recruiting': return '进行中';
      case 'Pending': return '设计中';
      case 'Completed': return '已结束';
      default: return status;
    }
  };

  const handleDelete = (id: string) => {
    setProjectToDelete(id);
  };

  const confirmDeleteProject = () => {
    if (!projectToDelete) return;
    const updated = projects.filter(p => p.id !== projectToDelete);
    setProjects(updated);
    localStorage.setItem('mock_projects', JSON.stringify(updated));
    setProjectToDelete(null);
  };

  const filteredProjects = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter ? p.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

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
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-600 outline-none focus:border-primary-500 min-w-[120px]"
          >
            <option value="">所有状态</option>
            <option value="Recruiting">进行中</option>
            <option value="Pending">设计中</option>
            <option value="Completed">已结束</option>
          </select>
          <div className="relative flex-1 xl:w-64">
             <input 
               type="text" 
               placeholder="请输入项目名称" 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none focus:border-primary-500"
             />
          </div>
          <button 
            onClick={() => { setSearchTerm(''); setStatusFilter(''); setFilter('all'); }}
            className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-md text-sm hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
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
           <div className="col-span-12 md:col-span-1">创建时间</div>
           <div className="col-span-12 md:col-span-1">操作</div>
         </div>

         {/* List Items */}
         <div className="divide-y divide-slate-50">
           {filteredProjects.length > 0 ? filteredProjects.map((project) => {
             const percent = project.targetCount > 0 ? Math.round((project.enrolledCount / project.targetCount) * 100) : 0;
             
             return (
               <div key={project.id} className="grid grid-cols-12 gap-4 p-6 items-center text-center text-sm hover:bg-slate-50 transition-colors group">
                 
                 {/* Name */}
                 <div className="col-span-12 md:col-span-3 text-left pl-4">
                   <div className="font-medium text-slate-600 group-hover:text-primary-600 transition-colors cursor-pointer truncate" title={project.name}>
                     {project.name}
                   </div>
                   {project.description && (
                     <div className="text-xs text-slate-400 mt-1 truncate" title={project.description}>
                       {project.description}
                     </div>
                   )}
                 </div>

                 {/* Status */}
                 <div className="col-span-6 md:col-span-2">
                   <span className={`inline-block w-20 py-1 rounded text-xs ${
                     project.status === 'Recruiting' ? 'bg-green-50 text-green-600' : 
                     project.status === 'Completed' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'
                   }`}>
                     {getStatusLabel(project.status)}
                   </span>
                 </div>

                 {/* Progress */}
                 <div className="col-span-12 md:col-span-3 text-left">
                   <div className="max-w-[240px] mx-auto md:mx-0">
                     <div className="text-xs text-slate-500 mb-2 flex justify-between">
                       <span>目标人数 {project.targetCount} 人</span>
                       {percent >= 100 && <span className="text-green-600 font-medium">已达标</span>}
                     </div>
                     <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                       <div 
                         style={{width: `${Math.min(percent, 100)}%`}} 
                         className={`h-full rounded-full transition-all duration-500 ease-out ${percent >= 100 ? 'bg-green-500' : 'bg-primary-500'}`}
                       ></div>
                     </div>
                     <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-normal text-slate-600">{percent}%</span>
                       <span className="text-xs text-slate-500">已入组 {project.enrolledCount} 人</span>
                     </div>
                   </div>
                 </div>

                 {/* Period */}
                 <div className="col-span-6 md:col-span-2 text-slate-600">
                   {project.periodValue} {project.periodUnit}
                 </div>

                 {/* Date */}
                 <div className="col-span-12 md:col-span-1 text-slate-500 text-xs">
                   {project.createDate.split(' ')[0]}
                 </div>

                 {/* Actions */}
                 <div className="col-span-12 md:col-span-1 flex justify-center">
                   <button 
                     onClick={() => handleDelete(project.id)}
                     className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                     title="删除项目"
                   >
                     <Trash2 size={18} />
                   </button>
                 </div>

               </div>
             );
           }) : (
             <div className="p-12 text-center text-slate-500">
               没有找到匹配的科研项目
             </div>
           )}
         </div>
      </div>

      {/* Pagination (Mock) */}
      <div className="flex justify-end pt-4">
         <div className="flex gap-2">
           <button className="px-3 py-1 bg-white border border-slate-200 rounded text-slate-400 text-xs disabled:opacity-50" disabled>上一页</button>
           <button className="px-3 py-1 bg-primary-600 text-white border border-primary-600 rounded text-xs">1</button>
           <button className="px-3 py-1 bg-white border border-slate-200 rounded text-slate-600 text-xs hover:bg-slate-50 disabled:opacity-50" disabled>下一页</button>
         </div>
      </div>

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">确认删除</h3>
            <p className="text-slate-600 mb-6">确定要删除该项目吗？此操作不可恢复。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteProject}
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

export default ProjectList;