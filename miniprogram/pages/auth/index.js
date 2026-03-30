const { login, register } = require('../../services/user');
const app = getApp();

Page({
  data: {
    mode: 'login', // 'login' or 'register'
    username: '',
    password: '',
    nickName: '',
    role: 'user',
    doctorCode: '',
    submitting: false,
  },

  setMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ mode });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  onRoleChange(e) {
    this.setData({ role: e.detail.value });
  },

  fillDoctorCode() {
    // 医生注册码需手动输入，不再自动填充
    wx.showToast({ title: '请向管理员索取医生注册码', icon: 'none' });
  },

  async handleSubmit() {
    const { mode, username, password, nickName, role, doctorCode } = this.data;
    if (!username || !password) {
      wx.showToast({ title: '请输入账号和密码', icon: 'none' });
      return;
    }

    if (mode === 'register' && role === 'doctor' && !doctorCode) {
      wx.showToast({ title: '请输入医生码', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      let user;
      if (mode === 'login') {
        try {
          user = await login({ username, password });
          console.log('[Auth] Login success, user:', user); // Debug log
        } catch (err) {
          if (err.message && err.message.includes('User not found')) {
             // 用户不存在，自动切换到注册模式或提示
             wx.showModal({
               title: '账号未注册',
               content: '当前微信账号未找到记录，是否前往注册？',
               confirmText: '去注册',
               success: (res) => {
                 if (res.confirm) {
                   // 切换到注册模式，保留用户名和密码
                   this.setData({ 
                     mode: 'register',
                     // 如果昵称为空，自动填入用户名
                     nickName: this.data.nickName || this.data.username 
                   });
                 }
               }
             });
             this.setData({ submitting: false });
             return;
          } else {
            throw err;
          }
        }
      } else {
        user = await register({
          username,
          password,
          nickName,
          role,
          doctorCode,
        });
        console.log('[Auth] Register success, user:', user); // Debug log
      }

      // Double check role
      if (!user.role) {
        console.warn('[Auth] User role is missing!', user);
      }

      // 切换用户时清理旧缓存，但保留 token（wxLogin 已存入）
      const currentToken = wx.getStorageSync('token');
      const currentOpenid = wx.getStorageSync('openid');
      wx.clearStorageSync();
      // 恢复认证凭证
      if (currentToken) wx.setStorageSync('token', currentToken);
      if (currentOpenid) wx.setStorageSync('openid', currentOpenid);
      app.globalData.user = user;
      wx.setStorageSync('user', user);
      
      wx.showToast({ title: mode === 'login' ? '登录成功' : '注册成功' });
      
      setTimeout(() => {
        // Use reLaunch to clear page stack and force onShow on home page
        wx.reLaunch({ url: '/pages/home/index' });
      }, 1500);

    } catch (err) {
      console.error('[Auth] Login/Register error:', err);
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },
});
