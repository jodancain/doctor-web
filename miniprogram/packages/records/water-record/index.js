const { call } = require('../../../utils/request');
const { formatTime, formatDate } = require('../../../utils/format');

const WATER_TARGET = 2000; // 目标饮水量 2000ml

Page({
  data: {
    currentAmount: 0, // 今日总饮水量
    targetAmount: WATER_TARGET,
    progress: 0, // 进度百分比
    customAmount: '', // 自定义水量输入值
    todayRecords: [], // 今日记录列表
    quickOptions: [
      { id: 'cup', name: '一杯水', icon: '🥤', amount: 200, type: 'water' },
      { id: 'bottle', name: '一瓶水', icon: '🍼', amount: 500, type: 'water' },
      { id: 'other', name: '其他', icon: '🥤', amount: 150, type: 'other' }
    ]
  },

  onLoad() {
    this.loadTodayRecords();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadTodayRecords();
  },

  async loadTodayRecords() {
    try {
      // 获取今日饮水记录
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      const todayEnd = todayStart + 24 * 60 * 60 * 1000;

      const result = await call('getRecords', {
        type: 'water',
        limit: 100
      });

      // 兼容处理：如果result是数组，直接使用；如果是对象且有data字段，取data
      const allRecords = Array.isArray(result) ? result : ((result && result.data) ? result.data : []);
      
      // 筛选今日记录
      const records = allRecords.filter(record => {
        const recordTime = record.createdAt || (record.date ? new Date(record.date).getTime() : 0);
        return recordTime >= todayStart && recordTime < todayEnd;
      });
      
      // 计算今日总饮水量
      const totalAmount = records.reduce((sum, record) => {
        return sum + (record.amount || record.volume || 0);
      }, 0);

      // 格式化记录列表
      const todayRecords = records.map(record => ({
        _id: record._id,
        amount: record.amount || record.volume || 0,
        type: record.type || 'water',
        typeName: this.getTypeName(record.type || 'water'),
        icon: this.getTypeIcon(record.type || 'water'),
        time: this.formatTimeOnly(record.createdAt || Date.now()),
        createdAt: record.createdAt || Date.now()
      })).sort((a, b) => b.createdAt - a.createdAt);

      // 计算进度
      const progress = Math.min((totalAmount / WATER_TARGET) * 100, 100);

      this.setData({
        currentAmount: totalAmount,
        progress: Math.round(progress),
        todayRecords
      }, () => {
        // 数据更新后绘制进度圆环
        this.drawProgress();
      });

    } catch (err) {
      console.error('加载饮水记录失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      // 加载失败时显示空数据
      this.setData({
        currentAmount: 0,
        progress: 0,
        todayRecords: []
      }, () => {
        this.drawProgress();
      });
    }
  },

  drawProgress() {
    const { progress, currentAmount, targetAmount } = this.data;
    
    const query = wx.createSelectorQuery().in(this);
    query.select('#progress-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          setTimeout(() => this.drawProgress(), 100);
          return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        
        const width = res[0].width;
        const height = res[0].height;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 20;
        const lineWidth = 24;

        // 绘制背景圆环
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 绘制进度圆环（带动画）
        const progressAngle = (progress / 100) * Math.PI * 2;
        const startAngle = -Math.PI / 2;
        
        // 动画参数
        const animationDuration = 1000;
        const startTime = Date.now();

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const animationProgress = Math.min(elapsed / animationDuration, 1);
          const easeProgress = 1 - Math.pow(1 - animationProgress, 3); // 缓动
          
          const currentAngle = progressAngle * easeProgress;

          // 清空并重绘背景
          ctx.clearRect(0, 0, width, height);
          
          // 绘制背景圆环
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = '#E5E7EB';
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.stroke();

          // 绘制进度圆环（蓝色）
          if (currentAngle > 0) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + currentAngle);
            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
          }

          if (animationProgress < 1) {
            requestAnimationFrame(animate);
          }
        };

        animate();
      });
  },

  getTypeName(type) {
    const map = {
      'water': '饮水',
      'bottle': '瓶装水',
      'tea': '茶水',
      'other': '其他'
    };
    return map[type] || '饮水';
  },

  getTypeIcon(type) {
    const map = {
      'water': '🥤',
      'bottle': '🍼',
      'tea': '☕',
      'other': '🥤'
    };
    return map[type] || '🥤';
  },

  async onQuickRecord(e) {
    const { amount, type, id } = e.currentTarget.dataset;
    const option = this.data.quickOptions.find(opt => opt.id === id);
    if (!option) return;

    try {
      wx.showLoading({ title: '记录中...' });

      await call('addRecord', {
        type: 'water',
        data: {
          amount: amount,
          volume: amount, // 兼容字段
          type: type || 'water',
          date: this.getTodayDate()
        }
      });

      wx.showToast({ title: `+${amount}ml`, icon: 'success', duration: 1000 });

      // 刷新数据
      setTimeout(() => {
        this.loadTodayRecords();
      }, 300);

    } catch (err) {
      console.error('记录失败', err);
      wx.showToast({ title: '记录失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 监听自定义水量输入
  onCustomAmountInput(e) {
    let value = e.detail.value;
    // 过滤非数字
    value = value.replace(/[^\d]/g, '');
    this.setData({ customAmount: value });
  },

  // 提交自定义水量记录
  async onCustomRecord() {
    const amount = parseInt(this.data.customAmount);
    if (!amount || amount <= 0) return;

    try {
      wx.showLoading({ title: '记录中...' });

      await call('addRecord', {
        type: 'water',
        data: {
          amount: amount,
          volume: amount, 
          type: 'water',
          date: this.getTodayDate()
        }
      });

      wx.showToast({ title: `+${amount}ml`, icon: 'success', duration: 1000 });

      // 清空输入框并刷新数据
      this.setData({ customAmount: '' });
      setTimeout(() => {
        this.loadTodayRecords();
      }, 300);

    } catch (err) {
      console.error('记录失败', err);
      wx.showToast({ title: '记录失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  getTodayDate() {
    return formatDate(Date.now());
  },

  formatTimeOnly(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
  },

  goBack() {
    wx.navigateBack();
  }
});
