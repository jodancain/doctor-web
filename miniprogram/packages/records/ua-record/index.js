const app = getApp();

// 图表配置
const CHART_CONFIG = {
  padding: { top: 20, right: 0, bottom: 20, left: 0 },
  lineColor: '#0f766e',
  lineWidth: 3,
  areaColorStart: 'rgba(16, 185, 129, 0.2)',
  areaColorEnd: 'rgba(16, 185, 129, 0.0)',
  limitLineColor: '#EF4444',
  limitLineValue: 420,
  smoothness: 0.4
};

Page({
  data: {
    newValue: 360,
    date: '',
    statusText: '正常范围',
    statusClass: 'normal',
    chartData: []
  },

  // 页面级变量
  canvas: null,
  ctx: null,
  chartWidth: 0,
  chartHeight: 0,
  dpr: 1,
  animationFrameId: null,
  animationProgress: 0,

  onLoad() {
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    
    this.setData({
      date: dateStr
    });

    this.updateStatus(this.data.newValue);
    
    // 初始化图表
    wx.createSelectorQuery()
      .select('#trendChart')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]) {
          this.initChart(res[0]);
        }
      });
  },

  async loadChartData() {
    try {
      const { call } = require('../../../utils/request');
      
      // 获取最近7天的尿酸记录
      const result = await call('getRecords', {
        type: 'ua',
        limit: 7
      });

      // 兼容处理：如果result是数组，直接使用；如果是对象且有data字段，取data
      const records = Array.isArray(result) ? result : ((result && result.data) ? result.data : []);
      
      // 转换为图表数据格式（按时间排序，取最近7条）
      const data = records
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
        .slice(-7)
        .map(record => record.value || 0);
      
      // 如果数据不足7条，用默认值填充
      while (data.length < 7) {
        data.unshift(0);
      }

      this.chartData = data;
      this.startAnimation();
    } catch (err) {
      console.error('[UaRecord] Load chart data error:', err);
      // 如果加载失败，使用空数据
      this.chartData = Array(7).fill(0);
      this.startAnimation();
    }
  },

  onUnload() {
    if (this.animationFrameId && this.canvas) {
      this.canvas.cancelAnimationFrame(this.animationFrameId);
    }
  },

  onSliderChange(e) {
    const val = e.detail.value;
    this.setData({ newValue: val });
    this.updateStatus(val);
  },

  onDateChange(e) {
    // 格式化为 DD/MM/YYYY
    const parts = e.detail.value.split('-');
    const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    this.setData({ date: formatted });
  },

  updateStatus(val) {
    let statusText = '';
    let statusClass = '';
    
    if (val <= 360) {
      statusText = '正常范围';
      statusClass = 'normal';
    } else if (val <= 420) {
      statusText = '偏高';
      statusClass = 'high';
    } else {
      statusText = '危险';
      statusClass = 'critical';
    }

    this.setData({ statusText, statusClass });
  },

  initChart(res) {
    const canvas = res.node;
    const ctx = canvas.getContext('2d');
    const dpr = wx.getSystemInfoSync().pixelRatio;
    
    canvas.width = res.width * dpr;
    canvas.height = res.height * dpr;
    ctx.scale(dpr, dpr);
    
    this.canvas = canvas;
    this.ctx = ctx;
    this.dpr = dpr;
    this.chartWidth = res.width;
    this.chartHeight = res.height;

    // 从数据库加载最近7天的尿酸记录数据
    this.loadChartData();
  },

  startAnimation() {
    this.animationProgress = 0;
    const animate = () => {
      this.animationProgress += 0.02;
      if (this.animationProgress >= 1) {
        this.animationProgress = 1;
        this.draw();
      } else {
        this.draw();
        this.animationFrameId = this.canvas.requestAnimationFrame(animate);
      }
    };
    this.animationFrameId = this.canvas.requestAnimationFrame(animate);
  },

  draw() {
    const { ctx, chartWidth, chartHeight, chartData } = this;
    const { padding } = CHART_CONFIG;
    
    ctx.clearRect(0, 0, chartWidth, chartHeight);

    // 1. 绘制限制线 (420)
    const contentHeight = chartHeight - padding.top - padding.bottom;
    const maxVal = 600;
    const minVal = 300;
    const range = maxVal - minVal;
    
    const limitY = padding.top + contentHeight - ((CHART_CONFIG.limitLineValue - minVal) / range) * contentHeight;
    
    ctx.beginPath();
    ctx.strokeStyle = CHART_CONFIG.limitLineColor;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.moveTo(padding.left, limitY);
    ctx.lineTo(chartWidth - padding.right, limitY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. 绘制曲线
    if (chartData.length < 2) return;

    const stepX = (chartWidth - padding.left - padding.right) / (chartData.length - 1);
    
    const points = chartData.map((val, i) => ({
      x: padding.left + i * stepX,
      y: padding.top + contentHeight - ((val - minVal) / range) * contentHeight
    }));

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // 裁剪区域实现动画
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, chartWidth * this.animationProgress, chartHeight);
    ctx.clip();

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) * CHART_CONFIG.smoothness;
      const cp1y = p0.y;
      const cp2x = p1.x - (p1.x - p0.x) * CHART_CONFIG.smoothness;
      const cp2y = p1.y;
      
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p1.x, p1.y);
    }

    ctx.lineWidth = CHART_CONFIG.lineWidth;
    ctx.strokeStyle = CHART_CONFIG.lineColor;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 3. 绘制渐变填充
    ctx.lineTo(points[points.length - 1].x, chartHeight - padding.bottom);
    ctx.lineTo(points[0].x, chartHeight - padding.bottom);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, padding.top, 0, chartHeight - padding.bottom);
    gradient.addColorStop(0, CHART_CONFIG.areaColorStart);
    gradient.addColorStop(1, CHART_CONFIG.areaColorEnd);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
  },

  async submitRecord() {
    const { newValue, date } = this.data;
    
    if (!newValue || newValue <= 0) {
      wx.showToast({ title: '请输入有效的尿酸值', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '保存中...' });
      
      const { call } = require('../../../utils/request');
      
      // 将日期格式转换为时间戳
      // date格式: DD/MM/YYYY，需要转换为时间戳
      let timestamp = Date.now();
      if (date) {
        const parts = date.split('/');
        if (parts.length === 3) {
          // DD/MM/YYYY -> YYYY-MM-DD
          const day = parts[0];
          const month = parts[1];
          const year = parts[2];
          const dateStr = `${year}-${month}-${day}`;
          const dateObj = new Date(dateStr);
          timestamp = dateObj.getTime();
        }
      }

      // 调用云函数保存记录
      const result = await call('addRecord', {
        type: 'ua',
        data: {
          value: newValue,
          timestamp: timestamp,
          createdAt: timestamp
        }
      });

      wx.hideLoading();
    wx.showToast({ title: '记录成功', icon: 'success' });
      
      // 乐观更新：先在本地更新图表数据，提升响应速度
      // 将新数据加入当前图表数据中（注意：chartData只存储数值，不存储时间，这里简化处理）
      // 实际上，为了准确性，我们最好重新构造 chartData
      // 但考虑到 loadChartData 会重新拉取，这里我们至少可以让用户感觉到“已保存”
      // 更好的做法是：手动把 newValue 加到 chartData 的末尾，并移除最早的一个（如果超过7个）
      
      const newChartData = [...this.chartData];
      newChartData.push(newValue);
      if (newChartData.length > 7) {
        newChartData.shift();
      }
      this.chartData = newChartData;
      this.startAnimation(); // 立即重绘

      // 后台静默刷新真实数据，确保一致性
      this.loadChartData();
      
      // 不再自动返回上一页，允许用户继续查看或操作
      // 如果需要返回，用户可以点击左上角返回按钮
      
    } catch (err) {
      wx.hideLoading();
      console.error('[UaRecord] Submit error:', err);
      wx.showToast({ 
        title: err.message || '保存失败，请重试', 
        icon: 'none',
        duration: 2000
      });
    }
  },

  goHistory() {
    wx.navigateTo({
      url: '/packages/records/ua-record/history/index',
      fail: (err) => {
        console.error('跳转失败', err);
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      }
    });
  }
});
