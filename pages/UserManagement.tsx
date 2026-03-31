import React, { useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Download, ChevronDown, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface User {
  id: number;
  name: string;
  code: string;
  org: string;
  status: '启用' | '停用';
  time: string;
}

const mockData: User[] = [
  { id: 1, name: '王主任', code: 'U001', status: '启用', time: '2024-03-25 10:00', org: '南方医科大学珠江医院' },
  { id: 2, name: '李护士', code: 'U002', status: '启用', time: '2024-03-25 10:00', org: '南方医科大学珠江医院' },
  { id: 3, name: '张医师', code: 'U003', status: '启用', time: '2024-03-25 10:00', org: '南方医科大学珠江医院' },
  { id: 4, name: '刘专家', code: 'U004', status: '停用', time: '2024-03-20 14:30', org: '南方医科大学南方医院' },
];

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('全部');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  
  // Modal state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    org: '南方医科大学珠江医院',
    status: '启用' as '启用' | '停用'
  });

  const filteredData = users.filter(item => {
    const matchesSearch = item.name.includes(searchTerm) || item.code.includes(searchTerm);
    const matchesOrg = selectedOrg === '全部' || item.org === selectedOrg;
    return matchesSearch && matchesOrg;
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        code: user.code,
        org: user.org,
        status: user.status
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        code: `U${String(users.length + 1).padStart(3, '0')}`,
        org: '南方医科大学珠江医院',
        status: '启用'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.code) return;
    
    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData, time: new Date().toISOString().replace('T', ' ').substring(0, 16) } : u));
    } else {
      setUsers([...users, {
        id: Date.now(),
        ...formData,
        time: new Date().toISOString().replace('T', ' ').substring(0, 16)
      }]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    setUserToDelete(id);
  };

  const confirmDeleteUser = () => {
    if (userToDelete === null) return;
    setUsers(users.filter(u => u.id !== userToDelete));
    setUserToDelete(null);
  };

  const toggleStatus = (id: number) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === '启用' ? '停用' : '启用', time: new Date().toISOString().replace('T', ' ').substring(0, 16) };
      }
      return u;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-sm transition-colors text-sm whitespace-nowrap"
          >
            <Plus size={16} className="mr-2" />
            新增用户
          </button>
          <button className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium whitespace-nowrap">
            <Download size={16} className="mr-2" />
            导出
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
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
               placeholder="搜索用户名称/编码..."
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
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
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
                      <button 
                        onClick={() => toggleStatus(item.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors ${
                          item.status === '启用' 
                            ? 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100' 
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {item.status === '启用' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {item.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{item.time}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal(item)}
                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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

      {/* User Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">{editingUser ? '编辑用户' : '新增用户'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">名称 *</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="如：张医生"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">编码/ID *</label>
                <input 
                  type="text" 
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="如：U001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">所属组织</label>
                <select 
                  value={formData.org}
                  onChange={e => setFormData({...formData, org: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="南方医科大学珠江医院">南方医科大学珠江医院</option>
                  <option value="南方医科大学南方医院">南方医科大学南方医院</option>
                  <option value="广东省人民医院">广东省人民医院</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      checked={formData.status === '启用'} 
                      onChange={() => setFormData({...formData, status: '启用'})}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    启用
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      checked={formData.status === '停用'} 
                      onChange={() => setFormData({...formData, status: '停用'})}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    停用
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleSave}
                disabled={!formData.name || !formData.code}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete !== null && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">确认删除</h3>
            <p className="text-slate-600 mb-6">确定要删除该用户吗？此操作不可恢复。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteUser}
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
}
