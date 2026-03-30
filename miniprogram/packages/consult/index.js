const { listDoctors } = require('../../services/user');
const { ensureAuth } = require('../../utils/auth');

Page({
  data: {
    doctors: [],
    loading: false,
  },

  onShow() {
    if (!ensureAuth()) return;
    this.loadDoctors();
  },

  async loadDoctors() {
    this.setData({ loading: true });
    try {
      const doctors = await listDoctors();
      console.log('[Consult] Loaded doctors:', doctors);
      this.setData({ doctors });
    } catch (err) {
      console.error('[Consult] Load failed:', err);
      wx.showToast({ title: '加载医生列表失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  startChat(e) {
    console.log('[Consult] startChat clicked', e);
    // 尝试从 data-item 获取（如果 WXML 修改了），或者保持原样从 data-openid 获取
    const { openid, name } = e.currentTarget.dataset;
    
    // 优先使用 dataset 中的 openid，如果医生是 mock 数据且没有 openid，
    // 理论上应该在导入数据库时就确保有 _openid 字段。
    // 这里做个容错：如果 dataset.openid 为空，尝试用 dataset.id (兼容旧代码)
    const targetOpenid = openid || e.currentTarget.dataset.id;

    if (!targetOpenid) {
      wx.showToast({ title: '医生信息不完整', icon: 'none' });
      return;
    }
    
    const url = `/packages/consult/chat/index?targetOpenid=${targetOpenid}&name=${encodeURIComponent(name)}&role=doctor`;
    console.log('[Consult] Navigating to:', url);
    
    wx.navigateTo({
      url: url,
      fail: (err) => {
        console.error('[Consult] Navigation failed:', err);
        wx.showToast({ title: '无法进入聊天页', icon: 'none' });
      }
    });
  },
});
