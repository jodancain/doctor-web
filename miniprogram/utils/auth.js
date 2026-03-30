const app = getApp();

const ensureAuth = () => {
  if (app.globalData.user) {
    return true;
  }
  wx.navigateTo({
    url: '/pages/auth/index',
  });
  return false;
};

const getCurrentUser = () => {
  return app.globalData.user;
};

const isDoctor = () => {
  return app.globalData.user && app.globalData.user.role === 'doctor';
};

module.exports = {
  ensureAuth,
  getCurrentUser,
  isDoctor,
};

