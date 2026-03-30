const { ensureAuth, getCurrentUser } = require('../../utils/auth');
const { updateProfile } = require('../../services/user');

const SECTION_CONFIG = {
  basic: { title: '基本信息', field: 'basic', type: 'basic' },
  history: { title: '病史记录', field: 'history', type: 'text' },
  pastHistory: { title: '既往史', field: 'pastHistory', type: 'text' },
  lifestyle: { title: '生活史', field: 'lifestyle', type: 'text' },
  allergies: { title: '过敏史', field: 'allergies', type: 'tags' },
  familyHistory: { title: '家族史', field: 'familyHistory', type: 'text' },
  physicalExam: { title: '体格检查', field: 'physicalExam', type: 'text' },
  labTests: { title: '化验检查', field: 'labTests', type: 'text' },
  medicationHistory: { title: '用药记录', field: 'medicationHistory', type: 'text' },
  assessment: { title: '病情评估', field: 'assessment', type: 'text' },
  followup: { title: '复诊随访', field: 'followup', type: 'text' },
  healthReport: { title: '健康报告', field: 'healthReport', type: 'text' },
};

Page({
  data: {
    section: '',
    title: '',
    field: '',
    type: 'text',
    editing: false,
    content: '',
    basicInfo: {},
    tags: [],
    newTag: '',
    saving: false,
  },

  onLoad(options) {
    if (!ensureAuth()) {
      return;
    }
    const section = options.section || 'basic';
    const config = SECTION_CONFIG[section];
    if (!config) {
      wx.showToast({ title: '无效的页面', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({
      section,
      title: config.title,
      field: config.field,
      type: config.type,
    });

    // 设置导航栏标题和右侧按钮
    wx.setNavigationBarTitle({
      title: config.title
    });
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#ffffff'
    });

    this.loadData();
  },

  onReady() {
    // 设置导航栏右侧按钮
    if (!this.data.editing) {
      wx.setNavigationBarColor({
        frontColor: '#000000',
        backgroundColor: '#ffffff'
      });
    }
  },

  loadData() {
    const user = getCurrentUser();
    if (!user) return;

    if (this.data.type === 'basic') {
      // 基本信息特殊处理
      this.setData({
        basicInfo: {
          name: user.name || '',
          gender: user.gender === 'male' ? '男' : (user.gender === 'female' ? '女' : ''),
          birthDate: user.birthDate || '',
          diagnosisYear: user.diagnosisYear || '',
          height: user.height || '',
          weight: user.weight || '',
          bloodType: user.bloodType || '',
        }
      });
    } else if (this.data.type === 'tags') {
      // 过敏史标签
      this.setData({
        tags: Array.isArray(user.allergies) ? [...user.allergies] : [],
      });
    } else {
      // 文本类型
      this.setData({
        content: user[this.data.field] || '',
      });
    }
  },

  onEdit() {
    this.setData({ editing: true });
  },

  onNavigationBarButtonTap() {
    // 点击导航栏右侧编辑按钮
    this.onEdit();
  },

  onCancel() {
    this.setData({ editing: false });
    this.loadData(); // 恢复原始数据
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  onBasicInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`basicInfo.${field}`]: e.detail.value
    });
  },

  onGenderChange(e) {
    this.setData({
      'basicInfo.gender': e.detail.value
    });
  },

  onBirthDateChange(e) {
    this.setData({
      'basicInfo.birthDate': e.detail.value
    });
  },

  onTagInput(e) {
    this.setData({ newTag: e.detail.value });
  },

  addTag() {
    const tag = this.data.newTag.trim();
    if (!tag) {
      wx.showToast({ title: '请输入标签', icon: 'none' });
      return;
    }
    if (this.data.tags.includes(tag)) {
      wx.showToast({ title: '标签已存在', icon: 'none' });
      return;
    }
    this.setData({
      tags: [...this.data.tags, tag],
      newTag: '',
    });
  },

  removeTag(e) {
    const { index } = e.currentTarget.dataset;
    const tags = [...this.data.tags];
    tags.splice(index, 1);
    this.setData({ tags });
  },

  async saveData() {
    this.setData({ saving: true });
    try {
      let updateData = {};

      if (this.data.type === 'basic') {
        // 基本信息
        updateData = {
          name: this.data.basicInfo.name,
          gender: this.data.basicInfo.gender === '男' ? 'male' : (this.data.basicInfo.gender === '女' ? 'female' : ''),
          birthDate: this.data.basicInfo.birthDate,
          diagnosisYear: this.data.basicInfo.diagnosisYear,
          height: this.data.basicInfo.height,
          weight: this.data.basicInfo.weight,
          bloodType: this.data.basicInfo.bloodType,
        };
      } else if (this.data.type === 'tags') {
        // 标签类型
        updateData = {
          [this.data.field]: this.data.tags,
        };
      } else {
        // 文本类型
        updateData = {
          [this.data.field]: this.data.content,
        };
      }

      await updateProfile(updateData);

      // 更新本地缓存
      const app = getApp();
      const user = getCurrentUser() || {};
      const newUser = { ...user, ...updateData };
      app.globalData.user = newUser;
      wx.setStorageSync('user', newUser);

      wx.showToast({ title: '保存成功', icon: 'success' });
      this.setData({ editing: false });
      // 重新加载数据以确保显示最新内容
      this.loadData();
    } catch (err) {
      console.error('Save failed', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },
});

