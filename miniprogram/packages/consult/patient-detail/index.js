const { getDoctorPatientOverview } = require('../services/chat');

Page({
  data: {
    patientId: '',
    patient: null,
    activeTab: 'overview', // overview, trend, medication, records
    summary: {},
    timeline: [],
    loading: true
  },

  onLoad(options) {
    const { id } = options;
    this.setData({ patientId: id });
    this.loadPatientData(id);
  },

  async loadPatientData(id) {
    wx.showLoading({ title: '加载中' });
    try {
      const res = await getDoctorPatientOverview(id);
      
      this.setData({
        loading: false,
        patient: {
          id: res.id,
          name: res.name,
          gender: res.gender,
          age: res.age,
          bmi: res.bmi != null ? Number(res.bmi).toFixed(1) : '--',
          diagnosis: res.diagnosis,
          tags: res.tags
        },
        summary: res.summary,
        timeline: [
          { date: '2024-05-15', type: '复诊', title: '病情稳定复查', desc: '尿酸控制达标，无新发关节肿痛。', doctor: '当前医生' },
          { date: '2024-04-02', type: '急诊', title: '急性发作处理', desc: '左足第一跖趾关节红肿热痛2天。', doctor: '当前医生' }
        ]
      });
    } catch (err) {
      console.error('Failed to load patient data', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    
    if (tab === 'records') {
      this.viewHealthProfile();
    }
  },

  // 拨打电话
  makeCall() {
    const phone = this.data.patient && this.data.patient.phone;
    if (!phone) {
      wx.showToast({ title: '该患者未留联系电话', icon: 'none' });
      return;
    }
    wx.makePhoneCall({ phoneNumber: phone });
  },

  // 发送消息
  sendMessage() {
    if (!this.data.patient) {
      wx.showToast({ title: '患者数据加载中', icon: 'none' });
      return;
    }
    const name = this.data.patient.nickName || this.data.patient.name || this.data.patient.username || '用户';
    wx.navigateTo({
      url: `/packages/consult/chat/index?targetOpenid=${this.data.patientId}&name=${encodeURIComponent(name)}&role=user`
    });
  },

  // 查看健康档案 (保持这个方法以防别处调用)
  viewHealthProfile() {
    wx.navigateTo({ 
      url: `/pages/medical-folder/index?patientId=${this.data.patientId}` 
    });
  },

  // 新建病历
  addMedicalRecord() {
    wx.showActionSheet({
      itemList: ['记录门诊病历', '记录随访记录', '上传检查报告'],
      success: (res) => {
        let section = '';
        if (res.tapIndex === 0) section = 'history';
        else if (res.tapIndex === 1) section = 'followup';
        else if (res.tapIndex === 2) section = 'labTests';
        
        if (section) {
          wx.navigateTo({
            url: `/pages/health-info/detail?section=${section}&patientId=${this.data.patientId}`
          });
        }
      }
    });
  }
});

