const { askAI } = require('../services/ai');

Page({
  data: {
    messages: [
      {
        _id: 'init-1',
        fromType: 'ai',
        content: '您好！我是您的痛风健康AI助手。您可以向我提问关于痛风饮食、用药、日常护理等方面的问题。',
        msgType: 'text'
      }
    ],
    content: '',
    loading: false,
    toView: '',
    keyboardHeight: 0
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: 'AI 健康助手' });
  },

  onInput(e) {
    this.setData({ content: e.detail.value });
  },

  onFocus(e) {
    if (e.detail.height) {
      this.setData({ keyboardHeight: e.detail.height });
      this.scrollToBottom();
    }
  },

  onBlur() {
    this.setData({ keyboardHeight: 0 });
  },

  async handleSend() {
    const text = (this.data.content || '').trim();
    if (!text) return;

    // 添加用户消息
    const userMsg = {
      _id: 'u-' + Date.now(),
      fromType: 'user',
      content: text,
      msgType: 'text'
    };

    const newMessages = [...this.data.messages, userMsg];

    this.setData({
      messages: newMessages,
      content: '', // 清空输入框
      loading: true
    });
    this.scrollToBottom();

    // 提取历史对话上下文 (排除第一条欢迎语，最多取最近的10条)
    const history = newMessages
      .filter(m => m._id !== 'init-1')
      .slice(-10)
      .map(m => ({
        role: m.fromType === 'ai' ? 'assistant' : 'user',
        content: m.content
      }));

    // 请求云函数获取 AI 回复
    try {
      const res = await askAI(history);
      
      const aiMsg = {
        _id: 'ai-' + Date.now(),
        fromType: 'ai',
        content: res.reply,
        msgType: 'text'
      };

      this.setData({
        messages: [...this.data.messages, aiMsg],
        loading: false
      });
      this.scrollToBottom();
    } catch (err) {
      console.error(err);
      wx.showToast({ title: 'AI 请求失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  scrollToBottom() {
    // 使用 setTimeout 确保在 DOM 更新后执行滚动
    setTimeout(() => {
      this.setData({ toView: 'scroll-bottom' });
    }, 100);
  }
});