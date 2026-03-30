const { call } = require('../../../utils/request');
const { formatDate } = require('../../../utils/format');

Page({
  data: {
    selectedDate: '', // 当前选择的日期（YYYY-MM-DD）
    activeCategory: '全部', // 当前选中的分类
    categories: ['全部', '早餐', '午餐', '晚餐', '加餐'],
    foods: [], // 当前日期的食物记录列表
    showAddModal: false, // 是否显示添加食物弹窗
    searchKeyword: '', // 搜索关键词
    foodDatabase: [
      // 低嘌呤食物（绿色）
      { name: '大米', purineLevel: 'low', category: '主食' },
      { name: '面条', purineLevel: 'low', category: '主食' },
      { name: '馒头', purineLevel: 'low', category: '主食' },
      { name: '包子', purineLevel: 'low', category: '主食' },
      { name: '燕麦', purineLevel: 'low', category: '主食' },
      { name: '鸡蛋', purineLevel: 'low', category: '蛋白质' },
      { name: '鸭蛋', purineLevel: 'low', category: '蛋白质' },
      { name: '牛奶', purineLevel: 'low', category: '饮品' },
      { name: '酸奶', purineLevel: 'low', category: '饮品' },
      { name: '苹果', purineLevel: 'low', category: '水果' },
      { name: '香蕉', purineLevel: 'low', category: '水果' },
      { name: '西瓜', purineLevel: 'low', category: '水果' },
      { name: '葡萄', purineLevel: 'low', category: '水果' },
      { name: '草莓', purineLevel: 'low', category: '水果' },
      { name: '梨', purineLevel: 'low', category: '水果' },
      { name: '黄瓜', purineLevel: 'low', category: '蔬菜' },
      { name: '西红柿', purineLevel: 'low', category: '蔬菜' },
      { name: '白菜', purineLevel: 'low', category: '蔬菜' },
      { name: '萝卜', purineLevel: 'low', category: '蔬菜' },
      { name: '土豆', purineLevel: 'low', category: '蔬菜' },
      { name: '冬瓜', purineLevel: 'low', category: '蔬菜' },
      { name: '青椒', purineLevel: 'low', category: '蔬菜' },
      
      // 中嘌呤食物（黄色）
      { name: '猪肉', purineLevel: 'medium', category: '肉类' },
      { name: '牛肉', purineLevel: 'medium', category: '肉类' },
      { name: '羊肉', purineLevel: 'medium', category: '肉类' },
      { name: '鸡肉', purineLevel: 'medium', category: '肉类' },
      { name: '鸭肉', purineLevel: 'medium', category: '肉类' },
      { name: '鹅肉', purineLevel: 'medium', category: '肉类' },
      { name: '草鱼', purineLevel: 'medium', category: '海鲜' },
      { name: '鲤鱼', purineLevel: 'medium', category: '海鲜' },
      { name: '鲫鱼', purineLevel: 'medium', category: '海鲜' },
      { name: '豆腐', purineLevel: 'medium', category: '豆制品' },
      { name: '豆浆', purineLevel: 'medium', category: '豆制品' },
      { name: '绿豆', purineLevel: 'medium', category: '豆类' },
      { name: '红豆', purineLevel: 'medium', category: '豆类' },
      { name: '黑豆', purineLevel: 'medium', category: '豆类' },
      { name: '花生', purineLevel: 'medium', category: '坚果' },
      { name: '核桃', purineLevel: 'medium', category: '坚果' },
      { name: '蘑菇', purineLevel: 'medium', category: '蔬菜' },
      { name: '菠菜', purineLevel: 'medium', category: '蔬菜' },
      { name: '芦笋', purineLevel: 'medium', category: '蔬菜' },

      // 高嘌呤食物（红色）
      { name: '猪肝', purineLevel: 'high', category: '内脏' },
      { name: '猪肾', purineLevel: 'high', category: '内脏' },
      { name: '猪肠', purineLevel: 'high', category: '内脏' },
      { name: '牛肝', purineLevel: 'high', category: '内脏' },
      { name: '羊肚', purineLevel: 'high', category: '内脏' },
      { name: '动物脑', purineLevel: 'high', category: '内脏' },
      { name: '沙丁鱼', purineLevel: 'high', category: '海鲜' },
      { name: '凤尾鱼', purineLevel: 'high', category: '海鲜' },
      { name: '秋刀鱼', purineLevel: 'high', category: '海鲜' },
      { name: '带鱼', purineLevel: 'high', category: '海鲜' },
      { name: '扇贝', purineLevel: 'high', category: '海鲜' },
      { name: '生蚝', purineLevel: 'high', category: '海鲜' },
      { name: '花甲', purineLevel: 'high', category: '海鲜' },
      { name: '虾', purineLevel: 'high', category: '海鲜' },
      { name: '小龙虾', purineLevel: 'high', category: '海鲜' },
      { name: '蟹', purineLevel: 'high', category: '海鲜' },
      { name: '浓肉汤', purineLevel: 'high', category: '汤类' },
      { name: '火锅汤', purineLevel: 'high', category: '汤类' },
      { name: '鸡汤', purineLevel: 'high', category: '汤类' },
      { name: '啤酒', purineLevel: 'high', category: '饮品' },
      { name: '白酒', purineLevel: 'high', category: '饮品' },
    ],
    filteredFoods: [], // 搜索结果
    newFoodCategory: '早餐', // 新添加食物的分类
  },

  onLoad() {
    // 设置默认日期为今天
    const today = new Date();
    const dateStr = formatDate(today.getTime());
    this.setData({ selectedDate: dateStr });
    this.loadFoods();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadFoods();
  },

  // 日期改变
  onDateChange(e) {
    const date = e.detail.value;
    this.setData({ selectedDate: date });
    this.loadFoods();
  },

  // 分类切换
  onCategoryTap(e) {
    const { category } = e.currentTarget.dataset;
    this.setData({ activeCategory: category });
    this.filterFoods();
  },

  // 加载食物记录
  async loadFoods() {
    try {
      const { selectedDate } = this.data;
      if (!selectedDate) return;

      // 将日期转换为时间戳范围（校验日期格式有效性）
      const startDate = new Date(selectedDate + ' 00:00:00').getTime();
      const endDate = new Date(selectedDate + ' 23:59:59').getTime();
      if (isNaN(startDate) || isNaN(endDate)) {
        console.error('[FoodLibrary] Invalid date:', selectedDate);
        return;
      }

      const result = await call('getRecords', {
        type: 'diet',
        limit: 100
      });

      // 兼容处理：如果result是数组，直接使用；如果是对象且有data字段，取data
      const allRecords = Array.isArray(result) ? result : ((result && result.data) ? result.data : []);
      
      // 筛选当天的记录
      const todayRecords = allRecords.filter(record => {
        const recordTime = record.createdAt || (record.date ? new Date(record.date).getTime() : 0);
        return recordTime >= startDate && recordTime < endDate;
      });

      // 格式化记录
      const foods = todayRecords.map(record => ({
        _id: record._id,
        name: record.name || '',
        purineLevel: record.color || record.purineLevel || 'low',
        category: record.category || record.mealType || '早餐',
        amount: record.amount || '',
        createdAt: record.createdAt || Date.now()
      }));

      this.setData({ foods }, () => {
        this.filterFoods();
      });

    } catch (err) {
      console.error('加载饮食记录失败', err);
      this.setData({ foods: [] }, () => {
        this.filterFoods();
      });
    }
  },

  // 筛选食物（按分类）
  filterFoods() {
    const { foods, activeCategory } = this.data;
    let filtered = [...foods];

    if (activeCategory !== '全部') {
      filtered = filtered.filter(item => item.category === activeCategory);
    }

    this.setData({ filteredFoods: filtered });
  },

  // 搜索食物
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });

    if (!keyword.trim()) {
      this.filterFoods();
      return;
    }

    // 搜索食物数据库
    const { foodDatabase } = this.data;
    const filtered = foodDatabase.filter(food => 
      food.name.includes(keyword)
    );
    this.setData({ filteredFoods: filtered });
  },

  // 显示添加弹窗
  onAddFood() {
    this.setData({ 
      showAddModal: true,
      searchKeyword: '',
      filteredFoods: []
    });
  },

  // 关闭添加弹窗
  onCloseModal() {
    this.setData({ 
      showAddModal: false,
      searchKeyword: '',
      filteredFoods: []
    });
  },

  // 选择食物分类（添加时）
  onSelectNewCategory(e) {
    const { category } = e.currentTarget.dataset;
    this.setData({ newFoodCategory: category });
  },

  // 添加食物到记录
  async onSelectFood(e) {
    const { name, purineLevel } = e.currentTarget.dataset;
    const { selectedDate, newFoodCategory } = this.data;

    if (!name) return;

    try {
      wx.showLoading({ title: '添加中...' });

      await call('addRecord', {
        type: 'diet',
        data: {
          name: name,
          color: purineLevel || 'low',
          purineLevel: purineLevel || 'low',
          category: newFoodCategory,
          mealType: newFoodCategory,
          date: selectedDate
        }
      });

      wx.showToast({ title: '添加成功', icon: 'success' });
      this.onCloseModal();
      
      // 刷新列表
      setTimeout(() => {
        this.loadFoods();
      }, 300);

    } catch (err) {
      console.error('添加食物失败', err);
      wx.showToast({ title: '添加失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 删除食物记录
  async onDeleteFood(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      confirmColor: '#EF4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' });
            
            // 调用云函数删除记录
            await call('deleteRecord', { type: 'diet', id });

            wx.showToast({ title: '已删除', icon: 'success' });
            
            // 延迟刷新，给云端数据库同步时间
            setTimeout(() => {
              this.loadFoods();
            }, 300);
          } catch (err) {
            console.error('删除失败', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  },

  // 获取嘌呤等级颜色
  getPurineColor(level) {
    const map = {
      'low': '#10B981',      // 绿色
      'medium': '#F59E0B',   // 黄色
      'high': '#EF4444'      // 红色
    };
    return map[level] || map['low'];
  },

  // 获取嘌呤等级标签
  getPurineLabel(level) {
    const map = {
      'low': '低嘌呤',
      'medium': '中嘌呤',
      'high': '高嘌呤'
    };
    return map[level] || map['low'];
  },

  goBack() {
    wx.navigateBack();
  }
});
