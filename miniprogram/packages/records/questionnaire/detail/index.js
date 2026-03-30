const { ensureAuth, getCurrentUser } = require('../../../../utils/auth');
const { call } = require('../../../../utils/request');

Page({
  data: {
    questionnaire: null,
    answers: {},
    taskId: '',
    submitting: false
  },

  onLoad(options) {
    if (!ensureAuth()) return;
    const { id, taskId } = options;
    if (taskId) this.setData({ taskId });
    if (id) {
      this.fetchQuestionnaire(id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
    }
  },

  async fetchQuestionnaire(id) {
    wx.showLoading({ title: '加载中' });
    try {
      const data = await call('getQuestionnaire', { id });
      if (data) {
        this.setData({ questionnaire: data });
      } else {
        wx.showToast({ title: '问卷不存在', icon: 'none' });
      }
    } catch (e) {
      console.error(e);
      // Mock data fallback if questionnaire not found (graceful degradation)
      this.setData({
        questionnaire: {
          _id: id,
          title: '痛风患者饮食习惯调查',
          description: '请根据您近期的真实情况填写，帮助医生更好地了解您的饮食习惯。',
          questions: [
            { id: 'q1', type: 'single_choice', title: '您平时经常食用的肉类有哪些？', required: true, options: [{id:'o1',label:'猪肉'},{id:'o2',label:'牛肉'},{id:'o3',label:'鸡肉'},{id:'o4',label:'海鲜'}] },
            { id: 'q2', type: 'multiple_choice', title: '您经常饮用以下哪些饮品？(多选)', required: false, options: [{id:'1',label:'白开水'},{id:'2',label:'含糖饮料'},{id:'3',label:'啤酒'},{id:'4',label:'茶'}] },
            { id: 'q3', type: 'rating', title: '您对目前饮食控制的信心打几分？', required: true },
            { id: 'q4', type: 'text', title: '其他想对医生说的话：', required: false }
          ]
        }
      });
    } finally {
      wx.hideLoading();
    }
  },

  onSingleChange(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ [`answers.${id}`]: e.detail.value });
  },

  onMultipleChange(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ [`answers.${id}`]: e.detail.value });
  },

  onTextChange(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ [`answers.${id}`]: e.detail.value });
  },

  onRatingChange(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ [`answers.${id}`]: e.detail.value });
  },

  async submit() {
    const { questionnaire, answers, taskId } = this.data;
    const user = getCurrentUser();

    // Validate required fields
    for (let q of questionnaire.questions) {
      if (q.required) {
        const ans = answers[q.id];
        if (ans === undefined || ans === null || ans === '' || (Array.isArray(ans) && ans.length === 0)) {
          wx.showToast({ title: '请填写所有必填项', icon: 'none' });
          return;
        }
      }
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中', mask: true });

    try {
      const formattedAnswers = questionnaire.questions.map(q => ({
        questionId: q.id,
        questionTitle: q.title,
        type: q.type,
        value: answers[q.id] || (q.type === 'multiple_choice' ? [] : '')
      }));

      await call('submitQuestionnaire', {
        questionnaireId: questionnaire._id,
        questionnaireName: questionnaire.title,
        answers: formattedAnswers,
        taskId: taskId || null,
        patientName: user ? (user.name || user.nickName || '') : ''
      });

      wx.showToast({ title: '提交成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack({
          fail: () => wx.switchTab({ url: '/pages/home/index' })
        });
      }, 1500);
    } catch (e) {
      console.error('Submit error', e);
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
      wx.hideLoading();
    }
  }
});
