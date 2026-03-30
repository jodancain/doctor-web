const app = getApp();
const { call } = require('../../../utils/request');

Page({
  data: {
    title: '用药提醒',
    medications: [],
    showAddModal: false,
    editingId: null, // 当前编辑的 ID
    newMedName: '',
    newMedDosage: '',
    newMedFreq: ''
  },

  onLoad() {
    console.log('[MedicationReminder] Page loaded');
    try {
      this.loadMedications();
    } catch (err) {
      console.error('[MedicationReminder] Load error:', err);
      wx.showToast({ title: '页面加载失败', icon: 'none' });
    }
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadMedications();
  },

  async loadMedications() {
    try {
      // 从云数据库获取用药提醒数据
      const result = await call('getRecords', {
        type: 'medication',
        limit: 100
      });

      // 兼容处理：如果result是数组，直接使用；如果是对象且有data字段，取data
      const records = Array.isArray(result) ? result : ((result && result.data) ? result.data : []);
      
      // 转换为页面所需格式
      const medications = records.map(record => ({
        _id: record._id,
        name: record.name || '',
        dosage: record.dosage || '',
        frequency: record.time ? `每日${record.time}` : '每日一次',
        type: Math.random() > 0.5 ? 'pill' : 'capsule', // 根据实际情况调整
        status: 'pending' // 根据实际情况判断是否已服用
      }));

      this.setData({ medications });
    } catch (err) {
      console.error('[MedicationReminder] Load medications error:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ medications: [] });
    }
  },

  onClockIn(e) {
    const { id } = e.currentTarget.dataset;
    const { medications } = this.data;
    
    const index = medications.findIndex(m => m._id === id);
    if (index > -1) {
      wx.showToast({ title: '打卡成功', icon: 'success' });
      
      const key = `medications[${index}].status`;
      this.setData({
        [key]: 'taken'
      });
      
      // TODO: 调用云函数保存打卡记录
    }
  },

  // --- 输入事件处理 ---
  
  onNameInput(e) {
    this.setData({ newMedName: e.detail.value });
  },

  onDosageInput(e) {
    this.setData({ newMedDosage: e.detail.value });
  },

  onFreqInput(e) {
    this.setData({ newMedFreq: e.detail.value });
  },

  // --- 编辑/添加逻辑 ---

  onAddMedication() {
    this.setData({ 
      showAddModal: true,
      editingId: null,
      newMedName: '',
      newMedDosage: '',
      newMedFreq: ''
    });
  },

  onEditMedication(e) {
    const { id } = e.currentTarget.dataset;
    const med = this.data.medications.find(m => m._id === id);
    if (!med) return;

    this.setData({
      showAddModal: true,
      editingId: id,
      newMedName: med.name,
      newMedDosage: med.dosage,
      newMedFreq: med.frequency
    });
  },

  closeAddModal() {
    this.setData({ 
      showAddModal: false,
      editingId: null,
      newMedName: '',
      newMedDosage: '',
      newMedFreq: ''
    });
  },

  async submitMedication() {
    const { newMedName, newMedDosage, newMedFreq, editingId, medications } = this.data;
    
    if (!newMedName || !newMedName.trim()) {
      wx.showToast({ title: '请输入药品名称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      if (editingId) {
        // 更新逻辑
        const index = medications.findIndex(m => m._id === editingId);
        if (index > -1) {
          const updateData = {
            name: newMedName.trim(),
            dosage: newMedDosage.trim() || '标准剂量',
            frequency: newMedFreq.trim() || '每日一次'
          };
          
          await call('updateRecord', {
            type: 'medication',
            id: editingId,
            data: updateData
          });

          const updated = [...medications];
          updated[index] = {
            ...updated[index],
            ...updateData
          };
          
          this.setData({
            medications: updated,
            showAddModal: false,
            editingId: null,
            newMedName: '',
            newMedDosage: '',
            newMedFreq: ''
          });
          
          wx.hideLoading();
          wx.showToast({ title: '更新成功', icon: 'success' });
        }
      } else {
        // 新增逻辑
        const newMed = {
          name: newMedName.trim(),
          dosage: newMedDosage.trim() || '标准剂量',
          frequency: newMedFreq.trim() || '每日一次',
          type: Math.random() > 0.5 ? 'pill' : 'capsule',
          status: 'pending'
        };

        const res = await call('addRecord', {
          type: 'medication',
          data: newMed
        });

        if (res && res._id) {
          newMed._id = res._id;
        } else {
          newMed._id = Date.now().toString();
        }

        this.setData({
          medications: [...medications, newMed],
          showAddModal: false,
          newMedName: '',
          newMedDosage: '',
          newMedFreq: ''
        });

        wx.hideLoading();
        wx.showToast({ title: '添加成功', icon: 'success' });
      }
    } catch (err) {
      console.error('Save medication error:', err);
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  deleteMedication() {
    const { editingId, medications } = this.data;
    if (!editingId) return;

    wx.showModal({
      title: '删除确认',
      content: '确定要删除该用药计划吗？删除后无法恢复。',
      confirmColor: '#EF4444',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          try {
            await call('deleteRecord', {
              type: 'medication',
              id: editingId
            });

            const newList = medications.filter(m => m._id !== editingId);
            this.setData({
              medications: newList,
              showAddModal: false,
              editingId: null,
              newMedName: '',
              newMedDosage: '',
              newMedFreq: ''
            });
            wx.hideLoading();
            wx.showToast({ title: '已删除', icon: 'none' });
          } catch (err) {
            console.error('Delete medication error:', err);
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});
