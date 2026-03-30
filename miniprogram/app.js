App({
  globalData: {
    user: null,
    // 退出登录前回调列表，页面可注册用于保存草稿等清理操作
    _logoutCallbacks: [],
  },

  onLaunch() {
    // 初始化日志管理器，尝试解决真机调试 "access 'wxfile://usr/miniprogramLog/'" 报错
    if (wx.getRealtimeLogManager) {
      wx.getRealtimeLogManager();
    }

    this.checkLogin();
  },

  checkLogin() {
    const user = wx.getStorageSync('user');
    if (user) {
      this.globalData.user = user;
    }
  },

  /**
   * 注册 logout 前回调（页面可在 onLoad 中调用，onUnload 中取消）
   * @param {Function} cb - 回调函数，同步执行
   * @returns {Function} 取消注册的函数
   */
  onBeforeLogout(cb) {
    this.globalData._logoutCallbacks.push(cb);
    return () => {
      const idx = this.globalData._logoutCallbacks.indexOf(cb);
      if (idx !== -1) this.globalData._logoutCallbacks.splice(idx, 1);
    };
  },

  logout() {
    // 通知所有已注册页面执行清理（如保存草稿）
    this.globalData._logoutCallbacks.forEach((cb) => {
      try { cb(); } catch (e) { console.warn('[App] logout callback error:', e); }
    });
    this.globalData._logoutCallbacks = [];

    this.globalData.user = null;
    wx.removeStorageSync('user');
    wx.removeStorageSync('token');
    wx.removeStorageSync('openid');
    // 清除可能存在的业务缓存
    wx.removeStorageSync('chat_history');
    wx.removeStorageSync('doctor_list_cache');

    wx.reLaunch({
      url: '/pages/auth/index',
    });
  },
});
