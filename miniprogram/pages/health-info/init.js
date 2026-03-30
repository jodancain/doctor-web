const { ensureAuth, getCurrentUser } = require('../../utils/auth');
const { updateProfile } = require('../../services/user');

Page({
  data: {
    name: '张伟',
    gender: 'male',
    birthDate: '1989-01-01',
    diagnosisYear: '',
    saving: false,
  },

  onLoad() {
    if (!ensureAuth()) {
      return;
    }
    // 如果已有基本信息，预填充
    const user = getCurrentUser();
    if (user) {
      this.setData({
        name: user.name || '张伟',
        gender: user.gender || 'male',
        birthDate: user.birthDate || '1989-01-01',
        diagnosisYear: user.diagnosisYear || '',
      });
    }
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  onGenderChange(e) {
    this.setData({ gender: e.detail.value });
  },

  onBirthDateChange(e) {
    this.setData({ birthDate: e.detail.value });
  },

  onDiagnosisYearInput(e) {
    this.setData({ diagnosisYear: e.detail.value });
  },

  async createProfile() {
    if (!this.data.name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (!this.data.birthDate) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    try {
      await updateProfile({
        name: this.data.name,
        gender: this.data.gender,
        birthDate: this.data.birthDate,
        diagnosisYear: this.data.diagnosisYear,
      });

      // 更新本地缓存
      const app = getApp();
      const user = getCurrentUser();
      const newUser = {
        ...user,
        name: this.data.name,
        gender: this.data.gender,
        birthDate: this.data.birthDate,
        diagnosisYear: this.data.diagnosisYear,
      };
      app.globalData.user = newUser;
      wx.setStorageSync('user', newUser);

      wx.showToast({ title: '建立成功', icon: 'success' });
      setTimeout(() => {
        // 跳转到病历夹页面（使用 navigateTo，因为病历夹不是 tabBar 页面）
        wx.navigateTo({ 
          url: '/pages/medical-folder/index',
          fail: (err) => {
            console.error('跳转病历夹失败', err);
            wx.showToast({ title: '跳转失败', icon: 'none' });
          }
        });
      }, 1500);
    } catch (err) {
      console.error('Create profile failed', err);
      wx.showToast({ title: '建立失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },
});

