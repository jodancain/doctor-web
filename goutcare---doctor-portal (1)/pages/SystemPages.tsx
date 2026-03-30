import React, { useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Download, ChevronDown } from 'lucide-react';

interface SystemPageProps {
  title: string;
  type: 'users' | 'roles' | 'orgs' | 'titles' | 'resources' | 'education';
}

// Mock data generator for different types
const getMockData = (type: string) => {
  const common = { status: '启用', time: '2024-03-25 10:00', org: '南方医科大学珠江医院' };
  
  switch (type) {
    case 'users':
      return [
        { id: 1, name: '王主任', code: 'U001', ...common },
        { id: 2, name: '李护士', code: 'U002', ...common },
        { id: 3, name: '张医师', code: 'U003', ...common },
        { id: 4, name: '刘专家', code: 'U004', status: '停用', time: '2024-03-20', org: '南方医科大学南方医院' },
      ];
    case 'roles':
      return [
        { id: 1, name: '超级管理员', code: 'ROLE_ADMIN', ...common },
        { id: 2, name: '医生', code: 'ROLE_DOCTOR', ...common },
        { id: 3, name: '护士', code: 'ROLE_NURSE', ...common },
      ];
    case 'orgs':
      return [
        { id: 1, name: '风湿免疫科', code: 'DEPT_001', ...common },
        { id: 2, name: '内分泌科', code: 'DEPT_002', ...common },
      ];
    default:
      return [
        { id: 1, name: '示例数据 1', code: 'CODE_001', ...common },
        { id: 2, name: '示例数据 2', code: 'CODE_002', ...common },
      ];
  }
};

// Generic placeholder component for system management pages
const SystemPagePlaceholder: React.FC<SystemPageProps> = ({ title, type }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('南方医科大学珠江医院');
  
  const mockData = getMockData(type);

  // Filter logic
  const filteredData = mockData.filter(item => {
    const matchesSearch = item.name.includes(searchTerm) || item.code.includes(searchTerm);
    // For 'users' type, we might filter by organization, for others maybe not strictly required but good for demo
    const matchesOrg = type === 'users' ? (selectedOrg === '全部' || item.org === selectedOrg) : true;
    return matchesSearch && matchesOrg;
  });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-sm transition-colors text-sm whitespace-nowrap">
            <Plus size={16} className="mr-2" />
            新增{title.replace('管理', '')}
          </button>
          <button className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium whitespace-nowrap">
            <Download size={16} className="mr-2" />
            导出
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
          {/* Organization Selector (Reference to picture) */}
          <div className="relative w-full md:w-auto">
             <select 
               value={selectedOrg}
               onChange={(e) => setSelectedOrg(e.target.value)}
               className="w-full md:w-56 appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium cursor-pointer"
             >
               <option value="全部">全部院区</option>
               <option value="南方医科大学珠江医院">南方医科大学珠江医院</option>
               <option value="南方医科大学南方医院">南方医科大学南方医院</option>
               <option value="广东省人民医院">广东省人民医院</option>
             </select>
             <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
          </div>

          <div className="relative flex-1 w-full md:w-64">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
             <input 
               type="text" 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder={`搜索${title}名称/编码...`}
               className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
             />
          </div>
          <button className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 hidden md:block">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase w-16">
                  <input type="checkbox" className="rounded border-slate-300" />
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">名称</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">编码/ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">所属组织</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">状态</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">更新时间</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4"><input type="checkbox" className="rounded border-slate-300" /></td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {item.code}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {item.org}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${
                        item.status === '启用' 
                          ? 'bg-green-50 text-green-700 border-green-100' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{item.time}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-primary-600 transition-colors"><MoreHorizontal size={18} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    未找到相关数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
            <div>共 {filteredData.length} 条数据</div>
            <div className="flex gap-2">
               <button className="px-3 py-1 border border-slate-200 rounded disabled:opacity-50" disabled>上一页</button>
               <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50" disabled>下一页</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import UserManagementComponent from './UserManagement';
import EducationManagementComponent from './EducationManagement';

export const UserManagement = () => <UserManagementComponent />;
export const RoleManagement = () => <SystemPagePlaceholder title="角色管理" type="roles" />;
export const OrgManagement = () => <SystemPagePlaceholder title="组织管理" type="orgs" />;
export const TitleManagement = () => <SystemPagePlaceholder title="职称管理" type="titles" />;
export const ResourceManagement = () => <SystemPagePlaceholder title="资源管理" type="resources" />;
export const EducationManagement = () => <EducationManagementComponent />;