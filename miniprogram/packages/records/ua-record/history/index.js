Page({
  data: {
    records: []
  },

  onLoad() {
    this.loadRecords();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadRecords();
  },

  async loadRecords() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const { call } = require('../../../../utils/request');
      
      // Debug Log: 打印调用开始
      console.log('[UaHistory] Start loading records...');

      // 从云数据库获取尿酸记录数据
      // call函数直接返回result.data，所以这里result就是记录数组
      const result = await call('getRecords', {
        type: 'ua',
        limit: 100
      });

      // Debug Log: 打印原始返回结果
      console.log('[UaHistory] Raw result:', result);

      // 兼容处理：如果result是数组，直接使用；如果是对象且有data字段（旧逻辑），取data
      const records = Array.isArray(result) ? result : ((result && result.data) ? result.data : []);
      
      // Debug Log: 打印记录数量
      console.log(`[UaHistory] Got ${records.length} records`);

      if (records.length === 0) {
        console.warn('[UaHistory] No records found. Check database permissions or openid.');
      }

      
      // 转换为页面所需格式，并按时间倒序排列（最新的在前）
      const formattedRecords = records
        .map((record, index) => {
          const timestamp = record.timestamp || record.createdAt || Date.now();
          const date = new Date(timestamp);
          
          // 格式化日期：12月4日
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const dateStr = `${month}月${day}日`;
          
          // 格式化时间：19:28
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          const timeStr = `${hours}:${minutes}`;
          
          const value = record.value || 0;
          const status = value > 420 ? 'high' : 'normal';
          
          return {
            id: record._id || index,
            date: dateStr,
            time: timeStr,
            value: value,
            status: status,
            remark: record.remark || '空腹', // 从数据库读取备注，默认为'空腹'
            timestamp: timestamp // 保留时间戳用于排序
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp); // 按时间倒序排列
      
      this.setData({ records: formattedRecords });
    } catch (err) {
      console.error('[UaHistory] Load records error:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ records: [] });
    } finally {
      wx.hideLoading();
    }
  }
});
