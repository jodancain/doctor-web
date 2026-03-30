const app = getApp();
const { call } = require('../../../utils/request');
const { formatDate } = require('../../../utils/format');

Page({
  data: {
    activeTab: 'record', // 'record' or 'stats'
    title: '记录发作',
    jointOptions: ['左大脚趾（第一跖趾关节）', '右大脚趾（第一跖趾关节）', '左膝', '右膝', '左踝', '右踝', '手指', '手肘', '耳廓（痛风石好发部位）', '腕关节', '肩关节', '多关节/全身'],
    triggerOptions: ['饮酒', '海鲜', '深海鱼', '动物内脏(肝/肾/脑)', '浓肉汤/火锅汤', '豆类及豆制品', '受凉', '熬夜劳累', '剧烈运动', '关节外伤', '特定药物(如利尿剂)', '开始降酸/调药'],
    durationOptions: ['少于1天', '1-3天', '3-7天', '大于7天'],
    selectedJoints: [],
    selectedTriggers: [],
    selectedDuration: '',
    painLevel: 0,
    painEmoji: '/images/emojis/smile.png',
    painColor: '#10B981',
    submitting: false,
    // 统计相关数据
    stats: {
      totalAttacks: 0,
      maxPain: 0,
      maxPainLabel: '',
      triggerStats: [],
      jointStats: [],
      history: []
    },
    chartReady: false,
    loadingStats: false
  },

  // 页面级变量，避免重复创建
  animationFrameId: null,
  canvasNode: null,

  onLoad() {
    this.updatePainStyle(0);
  },

  onTabChange(e) {
    const { tab } = e.currentTarget.dataset;
    if (tab === this.data.activeTab) return; // 防止重复切换
    
    // 使用wx.nextTick确保切换动画完成后再加载数据
    this.setData({ activeTab: tab }, () => {
      if (tab === 'stats') {
        // 延迟加载，避免切换时卡顿
        setTimeout(() => {
          this.loadStats();
        }, 100);
      }
    });
  },

  onShow() {
    // 如果当前在统计页，刷新数据
    if (this.data.activeTab === 'stats') {
      this.loadStats();
    }
  },

  onHide() {
    // 停止动画，释放资源
    this.stopAnimation();
  },

  onUnload() {
    // 清理资源
    this.stopAnimation();
    this.canvasNode = null;
  },

  stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  },

  async loadStats() {
    // 避免重复加载
    if (this.data.loadingStats) return;
    
    this.setData({ loadingStats: true });
    
    try {
      // 获取所有发作记录
      const result = await call('getRecords', {
        type: 'attack',
        limit: 1000
      });
      
      // 兼容处理：如果result是数组，直接使用；如果是对象且有data字段，取data
      const records = Array.isArray(result) ? result : ((result && result.data) ? result.data : []);
      this.calculateStats(records);
      
    } catch (err) {
      console.error('加载统计失败', err);
      wx.showToast({ title: '加载统计失败', icon: 'none' });
      // 出错时也设置为不加载状态，避免界面卡住
      this.setData({ 
        loadingStats: false,
        stats: {
          totalAttacks: 0,
          maxPain: 0,
          maxPainLabel: '',
          triggerStats: [],
          jointStats: [],
          history: []
        }
      });
    } finally {
      if (this.data.loadingStats) {
        this.setData({ loadingStats: false });
      }
    }
  },

  calculateStats(records) {
    if (!records || records.length === 0) {
      this.setData({
        stats: {
          totalAttacks: 0,
          maxPain: 0,
          maxPainLabel: '',
          triggerStats: [],
          jointStats: [],
          history: []
        }
      });
      return;
    }

    // 计算累计发作次数
    const totalAttacks = records.length;

    // 计算最高疼痛等级
    let maxPain = 0;
    let maxPainLabel = '';
    records.forEach(record => {
      const pain = record.painLevel || 0;
      if (pain > maxPain) {
        maxPain = pain;
        if (pain >= 7) {
          maxPainLabel = '剧烈疼痛';
        } else if (pain >= 4) {
          maxPainLabel = '中度疼痛';
        } else {
          maxPainLabel = '轻微疼痛';
        }
      }
    });

    // 统计诱因
    const triggerMap = {};
    records.forEach(record => {
      const triggers = record.triggers || [];
      triggers.forEach(trigger => {
        // 标准化诱因名称
        const normalizedTrigger = this.normalizeTrigger(trigger);
        triggerMap[normalizedTrigger] = (triggerMap[normalizedTrigger] || 0) + 1;
      });
    });

    const triggerStats = Object.keys(triggerMap).map(key => ({
      name: key,
      count: triggerMap[key],
      percentage: Math.round((triggerMap[key] / totalAttacks) * 100)
    })).sort((a, b) => b.count - a.count);

    // 统计发作部位
    const jointMap = {};
    records.forEach(record => {
      const joints = record.joints || [];
      joints.forEach(joint => {
        const normalizedJoint = this.normalizeJoint(joint);
        jointMap[normalizedJoint] = (jointMap[normalizedJoint] || 0) + 1;
      });
    });

    const jointStats = Object.keys(jointMap).map(key => ({
      name: key,
      count: jointMap[key],
      percentage: Math.round((jointMap[key] / totalAttacks) * 100)
    })).sort((a, b) => b.count - a.count).slice(0, 5); // 只显示前5个

    // 历史记录（按时间倒序）
      const history = records
      .map(record => ({
        date: formatDate(record.createdAt || record.startDate || Date.now()),
        joints: record.joints || [],
        painLevel: record.painLevel || 0,
        triggers: record.triggers || [],
        duration: record.duration || '',
        createdAt: record.createdAt || record.startDate || Date.now()
      }))
      .sort((a, b) => b.createdAt - a.createdAt);

    this.setData({
      stats: {
        totalAttacks,
        maxPain,
        maxPainLabel,
        triggerStats,
        jointStats,
        history
      }
    }, () => {
      // 数据更新后绘制图表（使用nextTick确保DOM更新完成）
      if (this.data.activeTab === 'stats') {
        wx.nextTick(() => {
          setTimeout(() => {
            this.drawPieChart();
          }, 200);
        });
      }
    });
  },

  normalizeTrigger(trigger) {
    // 标准化诱因名称，匹配图片中的选项
    const map = {
      '高嘌呤食物': '高嘌呤饮食',
      '高嘌呤饮食': '高嘌呤饮食',
      '饮酒': '饮酒',
      '海鲜': '海鲜',
      '受凉': '受凉',
      '熬夜': '熬夜劳累',
      '熬夜劳累': '熬夜劳累',
      '剧烈运动': '剧烈运动',
      '忘记吃药': '忘记吃药'
    };
    return map[trigger] || trigger;
  },

  normalizeJoint(joint) {
    // 标准化部位名称
    const map = {
      '左大脚趾': '左第一跖趾',
      '右大脚趾': '右第一跖趾',
      '左第一跖趾': '左第一跖趾',
      '右第一跖趾': '右第一跖趾'
    };
    return map[joint] || joint;
  },

  toggleJoint(e) {
    const { value } = e.currentTarget.dataset;
    const { selectedJoints } = this.data;
    const index = selectedJoints.indexOf(value);
    
    if (index > -1) {
      selectedJoints.splice(index, 1);
    } else {
      selectedJoints.push(value);
    }
    this.setData({ selectedJoints });
  },

  toggleTrigger(e) {
    const { value } = e.currentTarget.dataset;
    const { selectedTriggers } = this.data;
    const index = selectedTriggers.indexOf(value);
    
    if (index > -1) {
      selectedTriggers.splice(index, 1);
    } else {
      selectedTriggers.push(value);
    }
    this.setData({ selectedTriggers });
  },

  toggleDuration(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({ selectedDuration: value });
  },

  onPainChange(e) {
    const val = e.detail.value;
    this.setData({ painLevel: val });
    this.updatePainStyle(val);
  },

  updatePainStyle(level) {
    // 简单模拟 emoji 和颜色变化
    // 实际项目中需要引入对应的 emoji 图片资源
    // 0-3: 绿色/微笑
    // 4-6: 黄色/平淡
    // 7-10: 红色/哭泣
    let color = '#10B981';
    let emoji = '😊'; 
    
    if (level >= 7) {
      color = '#EF4444';
      emoji = '😭';
    } else if (level >= 4) {
      color = '#F59E0B';
      emoji = '😐';
    }

    this.setData({ 
      painColor: color,
      painEmoji: emoji
    });
    
    // 更新分数颜色的 hack (通过 selectorQuery 或 data binding)
    // 这里通过 data binding 在 wxml 中 style 控制比较繁琐，暂时复用 painColor 给 activeColor
  },

  async submitRecord() {
    const { selectedJoints, painLevel, selectedTriggers, selectedDuration } = this.data;
    
    if (selectedJoints.length === 0) {
      wx.showToast({ title: '请选择疼痛位置', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      await call('addRecord', {
        type: 'attack',
        data: {
          startDate: Date.now(),
          painLevel,
          joints: selectedJoints.map(j => this.normalizeJoint(j)), // 保存时关联标准术语
          originalJoints: selectedJoints, // 保存用户原始选择
          triggers: selectedTriggers,
          duration: selectedDuration,
          status: 'ongoing'
        }
      });
      
      wx.showToast({ title: '记录已保存，建议多喝水并休息', icon: 'none', duration: 3000 });
      
      // 重新加载统计
      this.loadStats();
      
      // 清空表单
      this.setData({
        selectedJoints: [],
        selectedTriggers: [],
        selectedDuration: '',
        painLevel: 0
      });
      this.updatePainStyle(0);

    } catch (err) {
      console.error(err);
      wx.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  drawPieChart() {
    const { triggerStats } = this.data.stats;
    if (!triggerStats || triggerStats.length === 0) {
      this.setData({ chartReady: true });
      return;
    }

    // 如果已有动画在进行，先停止
    this.stopAnimation();

    const query = wx.createSelectorQuery().in(this);
    query.select('#pie-chart')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          // Canvas未准备好，延迟重试
          setTimeout(() => this.drawPieChart(), 100);
          return;
        }

        const canvas = res[0].node;
        this.canvasNode = canvas;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        
        // 避免重复设置尺寸
        if (canvas.width !== res[0].width * dpr) {
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          ctx.scale(dpr, dpr);
        }

        const width = res[0].width;
        const height = res[0].height;
        
        console.log('[PieChart] Canvas size:', width, height, 'DPR:', dpr); // Debug

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 40;
        
        if (radius <= 0) {
          console.error('[PieChart] Radius too small:', radius);
          return;
        }

        const innerRadius = radius * 0.6; // 环形图

        // 颜色配置 (匹配图片)
        const colors = [
          '#EF4444', // 红
          '#F59E0B', // 橙
          '#10B981', // 绿
          '#3B82F6', // 蓝
          '#8B5CF6'  // 紫
        ];

        // 计算角度（预先计算，避免重复计算）
        const total = triggerStats.reduce((sum, item) => sum + item.count, 0);
        console.log('[PieChart] Total triggers:', total, triggerStats); // Debug

        if (total === 0) {
          this.setData({ chartReady: true });
          return;
        }

        // 预计算每个扇形的基础角度
        const slices = triggerStats.map((item, index) => ({
          angle: (item.count / total) * 2 * Math.PI,
          color: colors[index % colors.length]
        }));

        // 动画参数
        const animationDuration = 800; // 缩短到0.8秒，更流畅
        const startTime = Date.now();

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / animationDuration, 1);
          
          // 使用更平滑的缓动函数
          const easeProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

          // 使用clip区域优化渲染性能
          ctx.save();
          
          // 清空画布（使用透明而非clearRect，减少重绘）
          ctx.clearRect(0, 0, width, height);

          let currentAngle = -Math.PI / 2; // 从顶部开始
          const gap = 0.08; // 扇区间隔弧度

          slices.forEach((slice, index) => {
            const sliceAngle = slice.angle * easeProgress;
            
            // 只有当有多个扇区时才添加间隔，且扇区角度大于间隔才绘制
            // 如果只有一个扇区，不需要间隔
            const effectiveGap = slices.length > 1 ? gap : 0;
            
            // 即使 sliceAngle 很小，如果不绘制，会导致空白。
            // 应该至少绘制一点，或者只有当 truly empty 时才跳过。
            // 但这里 sliceAngle 是基于 progress 的，开始时很小。
            // 关键：如果总角度 < gap，是否不绘制？
            
            if (sliceAngle > 0) {
              // 调整绘制逻辑：始终绘制，gap 只在多扇区时生效
              let startAngle = currentAngle;
              let endAngle = currentAngle + sliceAngle;

              if (slices.length > 1) {
                 // 简单的 gap 处理：两端各缩进一半 gap
                 // 注意：如果 sliceAngle < effectiveGap，缩进后会导致 start > end
                 if (sliceAngle > effectiveGap) {
                   startAngle += effectiveGap / 2;
                   endAngle -= effectiveGap / 2;
                 } else {
                   // 角度太小，不绘制，或者只绘制一条线？
                   // 为了避免绘制错误，跳过极小扇区
                   startAngle = endAngle; // Skip
                 }
              }

              if (endAngle > startAngle) {
            ctx.beginPath();
                // 增加圆角效果 (通过线宽和lineCap实现更简单，但这里用arc路径)
                // 简单实现：直接绘制圆弧
                ctx.lineWidth = radius - innerRadius;
                ctx.lineCap = 'round'; // 圆角端点
                ctx.strokeStyle = slice.color;
                
                // 计算中间半径
                const middleRadius = (radius + innerRadius) / 2;
                
                ctx.arc(centerX, centerY, middleRadius, startAngle, endAngle);
                ctx.stroke();
              }
            }

            currentAngle += sliceAngle;
          });

          ctx.restore();

          if (progress < 1) {
            this.animationFrameId = canvas.requestAnimationFrame(animate);
          } else {
            this.animationFrameId = null;
            this.setData({ chartReady: true });
          }
        };

        // 重置chartReady状态
        this.setData({ chartReady: false }, () => {
          // 启动动画
          this.animationFrameId = canvas.requestAnimationFrame(animate);
        });
      });
  },

});
