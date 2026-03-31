import React, { useState } from 'react';
import { ChevronRight, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResearchProject } from '../types';
import { MOCK_PROJECTS } from '../constants';

const ProjectForm: React.FC = () => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const showFeedback = (type: 'error' | 'success', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const [formData, setFormData] = useState<Partial<ResearchProject>>({
    name: '',
    periodValue: '',
    periodUnit: '月',
    targetCount: 1,
    description: '',
    status: 'Pending',
  });

  const handleSave = () => {
    if (!formData.name) {
      showFeedback('error', '请输入项目名称');
      return;
    }
    if (!formData.targetCount || formData.targetCount < 1) {
      showFeedback('error', '请输入有效的目标人数');
      return;
    }

    const newProject: ResearchProject = {
      id: `RP${Date.now()}`,
      name: formData.name!,
      periodValue: formData.periodValue || '1',
      periodUnit: formData.periodUnit || '月',
      targetCount: Number(formData.targetCount),
      enrolledCount: 0,
      description: formData.description || '',
      status: 'Recruiting', // 发布后直接进入招募中
      createDate: new Date().toISOString().replace('T', ' ').split('.')[0]
    };

    const saved = localStorage.getItem('mock_projects');
    const projects = saved ? JSON.parse(saved) : MOCK_PROJECTS;
    
    const updatedProjects = [newProject, ...projects];
    localStorage.setItem('mock_projects', JSON.stringify(updatedProjects));
    
    navigate('/projects');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 min-h-[600px] flex flex-col">
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          feedback.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {feedback.text}
        </div>
      )}
      {/* Breadcrumb / Header matching the image style */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center text-sm text-slate-500">
          <span className="flex items-center hover:text-primary-600 cursor-pointer text-primary-600">
            <Edit3 size={14} className="mr-1" /> 基本信息
          </span>
          <ChevronRight size={14} className="mx-2 text-slate-300" />
          <span className="hover:text-primary-600 cursor-pointer">研究方案</span>
          <ChevronRight size={14} className="mx-2 text-slate-300" />
          <span className="hover:text-primary-600 cursor-pointer">CRF设计</span>
          <ChevronRight size={14} className="mx-2 text-slate-300" />
          <span className="font-bold text-slate-800">项目发布</span>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 p-8 md:px-20 md:py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          
          {/* Project Name */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <label className="md:col-span-3 text-right text-sm font-medium text-slate-600">
              <span className="text-red-500 mr-1">*</span>项目名称
            </label>
            <div className="md:col-span-9">
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="请输入名称" 
                className="w-full px-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder:text-slate-400 transition-shadow"
              />
            </div>
          </div>

          {/* Project Period */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <label className="md:col-span-3 text-right text-sm font-medium text-slate-600">
              项目周期
            </label>
            <div className="md:col-span-9 flex gap-4">
              <input 
                type="number" 
                min="1"
                value={formData.periodValue}
                onChange={e => setFormData({...formData, periodValue: e.target.value})}
                placeholder="请输入" 
                className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder:text-slate-400"
              />
              <div className="flex-1 relative">
                <select 
                  value={formData.periodUnit}
                  onChange={e => setFormData({...formData, periodUnit: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-slate-600 bg-white appearance-none"
                >
                  <option value="月">月</option>
                  <option value="年">年</option>
                  <option value="周">周</option>
                </select>
                <div className="absolute right-3 top-2.5 pointer-events-none">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Target Number */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <label className="md:col-span-3 text-right text-sm font-medium text-slate-600">
              <span className="text-red-500 mr-1">*</span>目标人数
            </label>
            <div className="md:col-span-9">
              <input 
                type="number" 
                min="1"
                value={formData.targetCount}
                onChange={e => setFormData({...formData, targetCount: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Project Introduction */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <label className="md:col-span-3 text-right text-sm font-medium text-slate-600 pt-2">
              项目介绍
            </label>
            <div className="md:col-span-9">
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="请输入项目介绍" 
                rows={6}
                className="w-full px-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder:text-slate-400 resize-none"
              ></textarea>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-8">
            <div className="md:col-start-4 md:col-span-9 flex gap-4">
              <button 
                className="px-6 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
                onClick={handleSave}
              >
                保存并发布
              </button>
              <button 
                className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                onClick={() => navigate('/projects')}
              >
                取消
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProjectForm;