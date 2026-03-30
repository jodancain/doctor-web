const { listInbox, deleteConversation, getDoctorPatientsList, getDoctorDashboardStats } = require('../services/chat');
const { getCurrentUser } = require('../../../utils/auth');

Page({
  data: {
    activeTab: 'home', // home, patients, messages, profile
    statusBarHeight: 20,
    
    // 用户信息
    currentUser: null,

    // 工作台数据
    stats: {
      totalPatients: 142,
      activePatients: 89,
      controlRate: 68,
      controlRateTrend: 2, // +2%
      highRiskCount: 12
    },
    todos: [
      { id: 1, title: '审核患者化验单', patientName: '王大明', deadline: '今日截止', type: 'urgent' },
      { id: 2, title: '审核患者化验单', patientName: '王大明', deadline: '今日截止', type: 'normal' },
      { id: 3, title: '审核患者化验单', patientName: '王大明', deadline: '今日截止', type: 'normal' }
    ],

    // 患者管理数据
    filterType: 'all', // all, high, not_standard, active
    searchQuery: '',
    patients: [],
    rawPatients: [], // 保存原始数据用于过滤

    // 消息列表数据
    conversations: [],
    loadingMessages: false,
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight,
      currentUser: getCurrentUser()
    });
    
    this.loadDashboardData();
    this.fetchPatients();
  },

  async fetchPatients() {
    wx.showLoading({ title: '加载中' });
    try {
      const list = await getDoctorPatientsList();
      this.setData({
        rawPatients: list || [],
      });
      // 默认应用 "全部" 过滤
      this.applyFilter('all');
    } catch (err) {
      console.error('Failed to fetch patients', err);
      const u = getCurrentUser();
      // 调试账号 doctoradmin 走本地 Mock 登录，云函数 OPENID 与库内医生可能不一致导致 403，给出演示列表避免空白
      if (u && u.username === 'doctoradmin') {
        const mock = [
          {
            id: 'debug_patient_openid_001',
            openid: 'debug_patient_openid_001',
            name: '调试患者',
            gender: '男',
            age: 40,
            ua: 380,
            lastVisit: '今天',
            status: 'High',
          },
        ];
        this.setData({ rawPatients: mock });
        this.applyFilter('all');
        wx.showToast({ title: '演示数据（请用真实医生账号登录云端）', icon: 'none', duration: 3000 });
      } else {
        wx.showToast({ title: err.message || '获取患者失败', icon: 'none' });
      }
    } finally {
      wx.hideLoading();
    }
  },

  onShow() {
    if (this.data.activeTab === 'messages') {
      this.loadInbox();
      this.startPolling();
    } else {
      this.stopPolling();
    }
  },

  onHide() {
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  // 切换 Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    
    if (tab === 'patients') {
      this.fetchPatients();
    }
    if (tab === 'messages') {
      this.loadInbox();
      this.startPolling();
    } else {
      this.stopPolling();
    }
  },

  // 加载仪表盘数据
  async loadDashboardData() {
    wx.showNavigationBarLoading();
    try {
      const dashboardData = await getDoctorDashboardStats();
      if (dashboardData) {
        this.setData({
          stats: dashboardData.stats,
          todos: dashboardData.todos
        });
      }
    } catch (err) {
      console.error('获取工作台数据失败', err);
    } finally {
      wx.hideNavigationBarLoading();
    }
  },

  // 患者筛选切换
  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ filterType: filter });
    this.applyFilter(filter);
  },

  applyFilter(filterType) {
    let filtered = this.data.rawPatients || [];
    
    if (filterType === 'high') {
      filtered = filtered.filter(p => p.status === 'Critical');
    } else if (filterType === 'not_standard') {
      filtered = filtered.filter(p => p.status === 'High' || p.status === 'Critical');
    } else if (filterType === 'active') {
      filtered = filtered.filter(p => p.lastVisit === '今天' || p.lastVisit.includes('1天前') || p.lastVisit.includes('2天前'));
    }

    this.setData({ patients: filtered });
  },

  // 跳转到患者详情（页面注册在分包 packages/consult 下，非 /pages/doctor）
  goToPatientDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      wx.showToast({ title: '缺少患者标识', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/packages/consult/patient-detail/index?id=${encodeURIComponent(id)}`
    });
  },

  // 跳转到待办处理
  handleTodo(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;

    if (item.title === '回复咨询消息') {
      wx.navigateTo({
        url: `/packages/consult/chat/index?targetOpenid=${item.patientOpenid}&name=${encodeURIComponent(item.patientName)}&role=user`
      });
    } else {
      // 审核化验单 / 高危处理等 -> 跳转到患者详情页
      wx.navigateTo({
        url: `/packages/consult/patient-detail/index?id=${item.patientOpenid}`
      });
    }
  },
  
  // 高危预警（暂无独立页面，避免跳转到未注册的 /pages/doctor/alerts）
  goToAlerts() {
    wx.showToast({ title: '高危列表功能开发中', icon: 'none' });
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          if (app && typeof app.logout === 'function') {
            app.logout();
          } else {
            wx.clearStorageSync();
            wx.reLaunch({ url: '/pages/auth/index' });
          }
        }
      }
    });
  },

  // ================= 消息相关逻辑 =================

  startPolling() {
    this.stopPolling();
    this._pollingTimer = setInterval(() => {
      this.loadInbox(true);
    }, 10000);
  },

  stopPolling() {
    if (this._pollingTimer) {
      clearInterval(this._pollingTimer);
      this._pollingTimer = null;
    }
  },

  async loadInbox(silent = false) {
    if (!silent) {
      this.setData({ loadingMessages: true });
    }
    try {
      const conversations = await listInbox();
      if (JSON.stringify(conversations) !== JSON.stringify(this.data.conversations)) {
        this.setData({ conversations });
      }
    } catch (err) {
      console.error('Load inbox failed', err);
    } finally {
      if (!silent) {
        this.setData({ loadingMessages: false });
      }
    }
  },

  goChat(e) {
    const { item } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/packages/consult/chat/index?targetOpenid=${item.partnerOpenid}&name=${encodeURIComponent(item.partnerName)}&role=${item.partnerRole}`,
    });
  },

  showDeleteAction(e) {
    const { item } = e.currentTarget.dataset;
    wx.showActionSheet({
      itemList: ['删除会话'],
      itemColor: '#FF4D4F',
      success: async (res) => {
        if (res.tapIndex === 0) {
          this.handleDelete(item.partnerOpenid);
        }
      }
    });
  },

  async handleDelete(targetOpenid) {
    wx.showLoading({ title: '删除中' });
    try {
      await deleteConversation(targetOpenid);
      wx.showToast({ title: '已删除' });
      this.loadInbox(); // 刷新列表
    } catch (err) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
