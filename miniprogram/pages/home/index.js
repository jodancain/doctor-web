const { formatDate } = require('../../utils/format');
const { fetchHomeSummary } = require('../../services/statistics');
const { ensureAuth, getCurrentUser } = require('../../utils/auth');
const { call } = require('../../utils/request');

const FEATURE_LIST = [
  { title: '健康档案', icon: '📋', bg: 'linear-gradient(135deg, #e6f7ff, #f2fbff)', path: '/pages/medical-folder/index' },
  { title: 'AI助手', icon: '🤖', bg: 'linear-gradient(135deg, #e0e7ff, #f3f4f6)', path: '/packages/consult/ai-chat/index' },
  { title: '服药提醒', icon: '💊', bg: 'linear-gradient(135deg, #e8f8f1, #f0fdfa)', path: '/packages/records/medication-reminder/index' },
  { title: '食物嘌呤', icon: '🔍', bg: 'linear-gradient(135deg, #fff3f3, #fff7f5)', path: '/packages/resources/food-library/index' },
  { title: '在线问诊', icon: '👨‍⚕️', bg: 'linear-gradient(135deg, #eaf9ff, #f4fbff)', path: '/packages/consult/index' },
  { title: '尿酸记录', icon: '📈', bg: 'linear-gradient(135deg, #eef0ff, #f6f8ff)', path: '/packages/records/ua-record/index' },
  { title: '发作记录', icon: '⚡', bg: 'linear-gradient(135deg, #fff5f5, #fffafa)', path: '/packages/records/attack-record/index' },
  { title: '饮水打卡', icon: '💧', bg: 'linear-gradient(135deg, #e0f2fe, #f0f9ff)', path: '/packages/records/water-record/index' },
];

const PENDING_ITEMS_CONFIG = [
  { 
    id: 'medical_history',
    title: '既往病史', 
    desc: '完善您的既往病史，帮助医生更好地了解您的健康状况', 
    action: '去完善', 
    path: '/pages/medical-folder/index',
    section: 'pastHistory',
    checkComplete: (user, summary) => {
      const hasProfile = !!(user && (user.name || user.gender || user.birthDate));
      const hasPastHistory = !!(user && user.pastHistory && user.pastHistory.trim().length > 0);
      return hasProfile && hasPastHistory;
    }
  },
  { 
    id: 'ua_record',
    title: '尿酸记录', 
    desc: '记录您的近期尿酸值，以便医生评估治疗效果', 
    action: '去记录', 
    path: '/packages/records/ua-record/index',
    checkComplete: (user, summary) => {
      if (!summary || !summary.latestUaTimestamp) return false;
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      return summary.latestUaTimestamp >= sevenDaysAgo;
    }
  },
  { 
    id: 'lab_test',
    title: '检验报告', 
    desc: '上传您的检验报告，帮助医生更好地了解您的健康状况', 
    action: '去上传', 
    path: '/pages/medical-folder/index',
    section: 'labTests',
    checkComplete: (user, summary) => {
      return !!(user && user.labTests && user.labTests.trim().length > 0);
    }
  },
];

const DOCTOR_FEATURE = [
  { title: '我的患者', icon: '👥', bg: 'linear-gradient(135deg, #e8f1ff, #f5f8ff)', path: '/packages/consult/doctor-client/index' },
  { title: '消息中心', icon: '💬', bg: 'linear-gradient(135deg, #e4f2ff, #edf7ff)', path: '/packages/consult/doctor-messages/index' },
];

Page({
  data: {
    latestUa: '--',
    latestUaDate: '--',
    attackCount7d: 0,
    waterTotal7d: 0,
    exerciseMinutes7d: 0,
    medicationCount: 0,
    user: null,
    featureList: FEATURE_LIST,
    pendingItems: [],
    infoCompletion: 0,
    latestUaStatus: '',
    uaMeasureHint: '请记录您的尿酸值',
    riskLevel: '低风险',
    todoList: [],
    newsList: [
      { title: '痛风患者的饮食指南', desc: '了解哪些食物可以吃，哪些食物需要避免' },
      { title: '如何正确测量尿酸', desc: '掌握正确的测量方法，确保数据的准确性' },
      { title: '痛风发作时的应对策略', desc: '学习在痛风发作时如何缓解疼痛和不适' }
    ],
    doctorInfo: {
      name: '张医生',
      title: '主任医师',
      hospital: '南方医科大学珠江医院',
      badge: '三甲医院',
    },
  },

  onShow() {
    if (!ensureAuth()) {
      return;
    }
    const app = getApp();
    app.checkLogin();
    const user = getCurrentUser();
    
    if (user && user.role === 'doctor') {
      wx.redirectTo({
        url: '/packages/consult/doctor-client/index',
        fail: (err) => {
          console.error('跳转医生工作台失败', err);
          this.setData({
            user,
            featureList: DOCTOR_FEATURE,
          });
        }
      });
      return;
    }
    
    this.setData({
      user,
      featureList: FEATURE_LIST,
    });
    this.loadSummary();
  },

  async loadSummary() {
    try {
      wx.showLoading({ title: '加载中', mask: true });
      const summary = (await fetchHomeSummary()) || {};
      const latestUaTimestamp = summary.latestUaTimestamp;
      
      const user = getCurrentUser();
      const { pendingItems, completion } = this.calculateCompletionStatus(user, summary);
      
      let dynamicTodos = [];
      try {
        const tasks = await call('getPendingTasks');
        if (tasks && tasks.length > 0) {
          dynamicTodos = tasks.map(task => ({
            title: task.title || '新问卷待填写',
            desc: '医生给您发送了一份健康问卷',
            icon: '📋',
            action: '去填写',
            path: `/packages/records/questionnaire/detail/index?id=${task.referenceId}&taskId=${task._id}`
          }));
        }
      } catch (e) {
        console.warn('Failed to fetch patient tasks', e);
      }

      const baseTodoList = [
        { title: '今日服药提醒', desc: '非布司他 40mg', icon: '💊', action: '去打卡', path: '/packages/records/medication-reminder/index' },
        { title: '今日饮水目标', desc: '建议饮水 2000ml / 已喝 800ml', icon: '💧', action: '去记录', path: '/packages/records/water-record/index' },
        { title: '复诊提醒', desc: '距离下次复诊还有 3 天', icon: '🏥', action: '去预约', path: '/packages/consult/index' }
      ];

      this.setData({
        latestUa:
          summary.latestUaValue !== null && summary.latestUaValue !== undefined
            ? summary.latestUaValue
            : '--',
        latestUaDate: latestUaTimestamp ? formatDate(latestUaTimestamp) : '--',
        attackCount7d: summary.attackCount7d || 0,
        waterTotal7d: summary.waterTotal7d || 0,
        exerciseMinutes7d: summary.exerciseMinutes7d || 0,
        medicationCount: summary.medicationCount || 0,
        latestUaStatus: this.getUaStatus(summary.latestUaValue),
        uaMeasureHint: this.getUaMeasureHint(latestUaTimestamp),
        pendingItems,
        infoCompletion: completion,
        riskLevel: (summary.latestUaValue && summary.latestUaValue > 420) ? '需关注' : '低风险',
        todoList: [...dynamicTodos, ...baseTodoList]
      });
    } catch (error) {
      console.error('loadSummary failed', error);
    } finally {
      wx.hideLoading();
    }
  },

  calculateCompletionStatus(user, summary) {
    const total = PENDING_ITEMS_CONFIG.length;
    let completed = 0;
    const pendingItems = [];

    PENDING_ITEMS_CONFIG.forEach(item => {
      const isComplete = item.checkComplete(user, summary);
      if (isComplete) {
        completed++;
      } else {
        pendingItems.push({
          ...item,
          path: item.path,
          section: item.section || ''
        });
      }
    });

    const completion = total > 0 ? Math.round((completed / total) * 100) : 100;
    
    return { pendingItems, completion };
  },

  getUaStatus(value) {
    if (value === null || value === undefined || value === '--') {
      return '未记录';
    }
    if (value >= 420) {
      return '偏高';
    }
    if (value >= 360) {
      return '临界';
    }
    return '正常';
  },

  getUaMeasureHint(timestamp) {
    if (!timestamp) {
      return '请记录您的尿酸值';
    }
    const today = new Date();
    const date = new Date(timestamp);
    const diffDays = Math.max(
      0,
      Math.round((today.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0)) / 86400000),
    );
    if (diffDays === 0) {
      return '今日已记录';
    }
    return `已连续 ${diffDays} 天未记录`;
  },

  handleFeatureTap(e) {
    const { path } = e.currentTarget.dataset;
    if (!path) {
      console.warn('未配置跳转路径');
      return;
    }

    const tabBarPages = [
      '/pages/home/index',
      '/pages/health-info/index',
      '/pages/account/index'
    ];

    if (tabBarPages.includes(path)) {
      wx.switchTab({ 
        url: path,
        fail: (err) => {
          console.error('跳转 tabBar 失败', err);
          wx.showToast({ title: '页面跳转失败', icon: 'none' });
        }
      });
      return;
    }

    wx.navigateTo({ 
      url: path,
      success: () => {
        console.log('跳转成功:', path);
      },
      fail: (err) => {
        console.error('跳转失败', err, '路径:', path);
        if (err.errMsg && err.errMsg.includes('timeout')) {
          wx.showModal({
            title: '提示',
            content: '页面加载超时，请检查网络后重试',
            showCancel: false
          });
        } else {
          wx.showToast({ 
            title: '页面跳转失败，请稍后重试', 
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },

  handlePendingTap(e) {
    const { path, section } = e.currentTarget.dataset;
    if (!path) return;

    if (path.startsWith('/pages/medical-folder/index')) {
      if (section) {
        wx.navigateTo({
          url: `/pages/health-info/detail?section=${section}`,
          fail: (err) => {
            console.error('跳转详情失败', err);
            wx.showToast({ title: '页面跳转失败', icon: 'none' });
          }
        });
      } else {
        wx.navigateTo({ 
          url: '/pages/medical-folder/index',
          fail: (err) => {
            console.error('跳转档案失败', err);
            wx.showToast({ title: '页面跳转失败', icon: 'none' });
          }
        });
      }
    } else {
      wx.navigateTo({ 
        url: path,
        fail: (err) => {
          console.error('跳转失败', err);
          wx.showToast({ title: '页面跳转失败', icon: 'none' });
        }
      });
    }
  },

  goMedicationReminder() {
    const path = '/packages/records/medication-reminder/index';
    wx.navigateTo({ 
      url: path,
      success: () => {
        console.log('跳转服药提醒成功');
      },
      fail: (err) => {
        console.error('跳转服药提醒失败', err);
        if (err.errMsg && err.errMsg.includes('timeout')) {
          wx.showModal({
            title: '提示',
            content: '页面加载超时，请检查网络后重试',
            showCancel: false
          });
        } else {
          wx.showToast({ 
            title: '跳转服药提醒失败', 
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },

  logout() {
    const app = getApp();
    if (app && typeof app.logout === 'function') {
      app.logout();
    }
  },
});
