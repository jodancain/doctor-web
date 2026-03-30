const { updateProfile } = require('../../services/user');
const { ensureAuth, getCurrentUser } = require('../../utils/auth');

Page({
  data: {
    user: null,
    form: {
      nickName: '',
      avatar: '',
    },
    saving: false,
  },

  onShow() {
    this.loadUser();
  },

  loadUser() {
    const user = getCurrentUser();
    this.setData({
      user,
      form: {
        nickName: user ? (user.nickName || user.username) : '',
        avatar: user ? user.avatar : '',
      },
    });
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`form.${field}`]: e.detail.value,
    });
  },

  async saveProfile() {
    if (!ensureAuth()) return;
    this.setData({ saving: true });
    try {
      await updateProfile(this.data.form);
      
      // Update local cache
      const app = getApp();
      const newUser = { ...app.globalData.user, ...this.data.form };
      app.globalData.user = newUser;
      wx.setStorageSync('user', newUser);
      this.setData({ user: newUser });

      wx.showToast({ title: '保存成功' });
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  switchAccount() {
    const app = getApp();
    app.logout();
  },

  goAuth() {
    wx.navigateTo({ url: '/pages/auth/index' });
  },
});

