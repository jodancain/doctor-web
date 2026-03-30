const { ensureAuth, getCurrentUser } = require('../../utils/auth');

Page({
  data: {
    user: null,
    hasProfile: false,
    profile: null,
    computed: {
      age: '--',
      duration: '--',
      bmi: '--',
      bmiStatus: '',
      riskLevel: '评估中'
    },
    // 模块配置
    modules: [
      {
        title: '基础档案',
        items: [
          { id: 'basic', icon: '👤', color: '#E0F2FE', name: '基本信息' },
          { id: 'lifestyle', icon: '💧', color: '#D1FAE5', name: '生活习惯' },
          { id: 'familyHistory', icon: '👨‍👩‍👧', color: '#DBEAFE', name: '家族病史' },
          { id: 'allergies', icon: '⚠️', color: '#FCE7F3', name: '过敏禁忌' }
        ]
      },
      {
        title: '病程记录',
        items: [
          { id: 'history', icon: '📝', color: '#FEF3C7', name: '现病史' },
          { id: 'pastHistory', icon: '📅', color: '#EDE9FE', name: '既往史' },
          { id: 'medicationHistory', icon: '💊', color: '#D1FAE5', name: '用药记录' },
          { id: 'followup', icon: '🏥', color: '#E0E7FF', name: '复诊随访' }
        ]
      },
      {
        title: '检查评估',
        items: [
          { id: 'physicalExam', icon: '🩺', color: '#CCFBF1', name: '体格检查' },
          { id: 'labTests', icon: '🧪', color: '#F3E8FF', name: '化验检查' },
          { id: 'assessment', icon: '📊', color: '#DBEAFE', name: '病情评估' },
          { id: 'healthReport', icon: '📄', color: '#FFE4E6', name: '健康报告' }
        ]
      }
    ]
  },

  onLoad() {
    if (!ensureAuth()) return;
    this.checkAndLoadProfile();
  },

  onShow() {
    if (!ensureAuth()) return;
    this.loadProfileData();
  },

  checkAndLoadProfile() {
    const user = getCurrentUser();
    if (!user) {
      wx.redirectTo({ url: '/pages/auth/index' });
      return;
    }

    const hasProfile = !!(user.name || user.gender || user.birthDate);
    this.setData({ user, hasProfile });

    if (!hasProfile) {
      wx.redirectTo({ 
        url: '/pages/health-info/init',
        fail: (err) => console.error('跳转失败', err)
      });
      return;
    }
    this.loadProfileData();
  },

  loadProfileData() {
    const user = getCurrentUser();
    if (!user) return;

    const profile = {
      name: user.name || '',
      gender: user.gender || '',
      birthDate: user.birthDate || '',
      diagnosisYear: user.diagnosisYear || '',
      height: user.height || '',
      weight: user.weight || '',
      bloodType: user.bloodType || '',
    };

    const computed = this.calculateDerivedData(user);
    this.setData({ profile, computed });
  },

  calculateDerivedData(user) {
    let age = '--';
    let duration = '--';
    let bmi = '--';
    let bmiStatus = '';

    if (user.birthDate) {
      const birthYear = new Date(user.birthDate).getFullYear();
      const currentYear = new Date().getFullYear();
      age = currentYear - birthYear;
    }

    if (user.diagnosisYear) {
      const currentYear = new Date().getFullYear();
      duration = Math.max(0, currentYear - parseInt(user.diagnosisYear)) + '年';
    } else {
      duration = '未记录';
    }

    if (user.height && user.weight) {
      const h = user.height / 100;
      const bmiValue = (user.weight / (h * h)).toFixed(1);
      bmi = bmiValue;
      
      if (bmiValue < 18.5) bmiStatus = '偏瘦';
      else if (bmiValue < 24) bmiStatus = '正常';
      else if (bmiValue < 28) bmiStatus = '超重';
      else bmiStatus = '肥胖';
    }

    return { age, duration, bmi, bmiStatus, riskLevel: '低风险' };
  },

  goToDetail(e) {
    const { section } = e.currentTarget.dataset;
    if (!section) return;
    
    wx.navigateTo({
      url: `/pages/health-info/detail?section=${section}`,
      fail: (err) => {
        console.error('跳转详情页失败', err);
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      }
    });
  }
});

