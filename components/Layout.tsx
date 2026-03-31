import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Stethoscope, Settings, Menu, X, Bell, Activity, ClipboardList, ClipboardCheck, FileEdit, Database, ChevronDown, UserCog, Shield, Building2, Award, BookOpen, ChevronUp, LogOut, Check, User, MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  // Menu states
  const [isQuestionnaireMenuOpen, setIsQuestionnaireMenuOpen] = useState(location.pathname.includes('/questionnaires'));
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(location.pathname.includes('/system'));
  
  // Profile menu state
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [currentOrg, setCurrentOrg] = useState('南方医科大学珠江医院');
  const [doctorName, setDoctorName] = useState('医生');
  const [avatar, setAvatar] = useState('');
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.getMe();
        if (data.nickName) setDoctorName(data.nickName);
        if (data.hospital) setCurrentOrg(data.hospital);
        if (data.avatar) setAvatar(data.avatar);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    fetchProfile();

    window.addEventListener('profileUpdated', fetchProfile);

    // Poll unread message count
    const fetchUnread = () => {
      api.getUnreadCount().then(data => setUnreadMsgCount(data.unreadCount || 0)).catch(() => {});
    };
    fetchUnread();
    const unreadInterval = setInterval(fetchUnread, 30000);

    return () => {
      window.removeEventListener('profileUpdated', fetchProfile);
      clearInterval(unreadInterval);
    };
  }, []);
  
  const navigate = useNavigate();

  const getPageInfo = (pathname: string) => {
    if (pathname.includes('/dashboard')) return {
      title: '工作台概览',
      desc: '查看今日患者动态及重点关注人群'
    };
    if (pathname.includes('/patients')) return {
      title: '患者管理',
      desc: '管理患者档案、随访记录及治疗方案'
    };
    if (pathname.includes('/chat')) return {
      title: '消息中心',
      desc: '与患者在线沟通交流'
    };
    if (pathname.includes('/ai-consult')) return {
      title: '临床决策辅助',
      desc: '基于 AI 的病情分析与指南检索助手'
    };
    if (pathname.includes('/projects')) return {
      title: '科研项目',
      desc: '管理临床研究项目与 CRF 设计'
    };
    if (pathname.includes('/questionnaires/design')) return {
      title: '问卷设计',
      desc: '创建与管理临床调查问卷模板'
    };
    if (pathname.includes('/questionnaires/records')) return {
      title: '问卷记录',
      desc: '查看患者填写的问卷反馈'
    };
    // System Management Pages
    if (pathname.includes('/system/users')) return { title: '用户管理', desc: '管理系统用户账号与权限分配' };
    if (pathname.includes('/system/roles')) return { title: '角色管理', desc: '配置系统角色与功能权限' };
    if (pathname.includes('/system/orgs')) return { title: '组织管理', desc: '维护医院科室与组织架构' };
    if (pathname.includes('/system/titles')) return { title: '职称管理', desc: '管理医护人员职务与职称体系' };
    if (pathname.includes('/system/resources')) return { title: '资源管理', desc: '系统静态资源与菜单配置' };
    if (pathname.includes('/system/education')) return { title: '医院宣教', desc: '发布与管理患者健康教育内容' };
    
    if (pathname.includes('/settings')) return { title: '个人设置', desc: '管理个人资料与偏好' };
    
    return { title: '风湿慢病管理系统', desc: '医生端工作台' };
  };

  const { title, desc } = getPageInfo(location.pathname);

  const NavItem = ({ path, icon: Icon, label }: { path: string; icon: any; label: string }) => {
    const isActive = location.pathname.includes(path);
    return (
      <button
        onClick={() => {
          navigate(path);
          setIsMobileMenuOpen(false);
        }}
        className={`flex items-center w-full px-4 py-3 mb-1 text-sm font-medium transition-colors rounded-lg ${
          isActive
            ? 'bg-primary-50 text-primary-600'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">Dr</div>
          <span className="font-bold text-slate-800">医生工作台</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 hidden md:flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-primary-600/20">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg">GoutCare</h1>
              <p className="text-xs text-slate-500">医生端管理系统</p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 md:py-0 space-y-1 overflow-y-auto no-scrollbar">
            <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">临床管理</div>
            <NavItem path="/dashboard" icon={LayoutDashboard} label="工作台" />
            <NavItem path="/patients" icon={Users} label="患者列表" />

            {/* Chat with unread badge */}
            <button
              onClick={() => {
                navigate('/chat');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center justify-between w-full px-4 py-3 mb-1 text-sm font-medium transition-colors rounded-lg ${
                location.pathname.includes('/chat')
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center">
                <MessageSquare className={`w-5 h-5 mr-3 ${location.pathname.includes('/chat') ? 'text-primary-600' : 'text-slate-400'}`} />
                消息中心
              </div>
              {unreadMsgCount > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                </span>
              )}
            </button>
            
            {/* Questionnaire Menu Group */}
            <div>
              <button
                onClick={() => setIsQuestionnaireMenuOpen(!isQuestionnaireMenuOpen)}
                className={`flex items-center justify-between w-full px-4 py-3 mb-1 text-sm font-medium transition-colors rounded-lg ${
                  location.pathname.includes('/questionnaires') ? 'text-slate-900 bg-slate-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center">
                  <ClipboardCheck className={`w-5 h-5 mr-3 ${location.pathname.includes('/questionnaires') ? 'text-primary-600' : 'text-slate-400'}`} />
                  问卷管理
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isQuestionnaireMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isQuestionnaireMenuOpen && (
                <div className="ml-4 pl-4 border-l border-slate-200 space-y-1 mt-1 animate-fade-in">
                  <NavItem path="/questionnaires/design" icon={FileEdit} label="问卷设计" />
                  <NavItem path="/questionnaires/records" icon={Database} label="问卷记录" />
                </div>
              )}
            </div>

            <NavItem path="/projects" icon={ClipboardList} label="科研项目" />
            <NavItem path="/ai-consult" icon={Stethoscope} label="AI 辅助决策" />
            
            {/* System Management Menu Group */}
            <div>
              <button
                onClick={() => setIsSystemMenuOpen(!isSystemMenuOpen)}
                className={`flex items-center justify-between w-full px-4 py-3 mb-1 text-sm font-medium transition-colors rounded-lg ${
                  location.pathname.includes('/system') ? 'text-slate-900 bg-slate-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center">
                  <Settings className={`w-5 h-5 mr-3 ${location.pathname.includes('/system') ? 'text-primary-600' : 'text-slate-400'}`} />
                  系统管理
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isSystemMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isSystemMenuOpen && (
                <div className="ml-4 pl-4 border-l border-slate-200 space-y-1 mt-1 animate-fade-in">
                  <NavItem path="/system/users" icon={UserCog} label="用户管理" />
                  <NavItem path="/system/roles" icon={Shield} label="角色管理" />
                  <NavItem path="/system/orgs" icon={Building2} label="组织管理" />
                  <NavItem path="/system/titles" icon={Award} label="职称管理" />
                  <NavItem path="/system/resources" icon={Database} label="资源管理" />
                  <NavItem path="/system/education" icon={BookOpen} label="医院宣教" />
                </div>
              )}
            </div>
            
            <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6">个人</div>
            <NavItem path="/settings" icon={Settings} label="设置" />
          </nav>

          <div className="p-4 border-t border-slate-100 relative">
            {isProfileMenuOpen && (
              <>
                {/* Invisible overlay for clicking outside */}
                <div 
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsProfileMenuOpen(false)}
                />
                <div 
                  className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in origin-bottom"
                >
                 <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">当前组织</p>
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                       <Building2 size={16} className="text-primary-600" />
                       {currentOrg}
                    </div>
                 </div>
                 
                 <div className="p-2">
                   <div className="px-3 py-2 text-xs font-semibold text-slate-400">切换院区</div>
                   {['南方医科大学珠江医院', '南方医科大学南方医院', '广东省人民医院'].map((org) => (
                     <button
                       key={org}
                       onClick={() => {
                         setCurrentOrg(org);
                         setIsProfileMenuOpen(false);
                       }}
                       className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                         currentOrg === org 
                           ? 'bg-primary-50 text-primary-700 font-medium' 
                           : 'text-slate-600 hover:bg-slate-50'
                       }`}
                     >
                       <span className="truncate pr-2">{org}</span>
                       {currentOrg === org && <Check size={16} className="flex-shrink-0" />}
                     </button>
                   ))}
                 </div>

                 <div className="h-px bg-slate-100 my-1"></div>

                 <div className="p-2">
                   <button 
                     onClick={() => {
                       navigate('/settings');
                       setIsProfileMenuOpen(false);
                     }}
                     className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                   >
                     <User size={16} />
                     个人资料
                   </button>
                   <button 
                     onClick={onLogout}
                     className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                   >
                     <LogOut size={16} />
                     退出登录
                   </button>
                 </div>
              </div>
              </>
            )}
            
            {/* Clickable Profile Card */}
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border w-full transition-all text-left ${
                isProfileMenuOpen 
                  ? 'bg-white border-primary-500 shadow-md ring-1 ring-primary-500' 
                  : 'bg-slate-50 border-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="relative">
                <img src={avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&background=0D8ABC&color=fff`} alt="User" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{doctorName}</p>
                <p className="text-xs text-slate-500 truncate">{currentOrg}</p>
              </div>
              <ChevronUp size={16} className={`text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
              <p className="text-slate-500 text-sm mt-1">{desc}</p>
            </div>
            <div className="flex gap-4">
              <button className="relative p-2 text-slate-400 hover:text-primary-600 transition-colors bg-white rounded-full shadow-sm border border-slate-100">
                <Bell size={20} />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
            </div>
          </header>

          <div className="animate-fade-in">
            {children}
          </div>
        </div>
      </main>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden glass"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Click outside to close profile menu (Invisible overlay for desktop) */}
      {/* Moved to be inside the relative container to avoid z-index issues */}
    </div>
  );
};

export default Layout;