const { listInbox, deleteConversation } = require('../services/chat');
const { ensureAuth } = require('../../../utils/auth');

Page({
  data: {
    conversations: [],
    loading: false,
    pollingTimer: null,
    isPullingDown: false,
  },

  onShow() {
    if (!ensureAuth()) return;
    this.loadInbox();
    this.startPolling();
  },

  onHide() {
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  onPullDownRefresh() {
    this.setData({ isPullingDown: true });
    this.loadInbox(false).then(() => {
      wx.stopPullDownRefresh();
      this.setData({ isPullingDown: false });
    });
  },

  startPolling() {
    this.stopPolling();
    this.data.pollingTimer = setInterval(() => {
      if (!this.data.isPullingDown) {
        this.loadInbox(true);
      }
    }, 10000);
  },

  stopPolling() {
    if (this.data.pollingTimer) {
      clearInterval(this.data.pollingTimer);
      this.data.pollingTimer = null;
    }
  },

  async loadInbox(silent = false) {
    if (!silent) {
      this.setData({ loading: true });
    }
    try {
      const conversations = await listInbox();
      if (JSON.stringify(conversations) !== JSON.stringify(this.data.conversations)) {
        this.setData({ conversations });
      }
    } catch (err) {
      if (!silent) {
        // wx.showToast({ title: '加载消息失败', icon: 'none' });
      }
      console.error('Load inbox failed', err);
    } finally {
      if (!silent) {
        this.setData({ loading: false });
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
