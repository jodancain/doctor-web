const { call } = require('../../utils/request');

Page({
  data: {
    activeCategory: '全部',
    categories: [
      { id: 'all', name: '全部' },
      { id: 'diet', name: '饮食' },
      { id: 'medication', name: '药物' },
      { id: 'basic', name: '基础' },
      { id: 'lifestyle', name: '生活' }
    ],
    hotArticle: null,
    articles: [],
    filteredArticles: [],
    loading: true
  },

  // 兼容历史数据中的多种发布状态写法，避免“有文章但列表为空”
  isPublishedArticle(article) {
    if (!article) return false;
    const status = article.status;
    if (status === undefined || status === null || status === '') return true; // 兼容旧数据
    if (typeof status === 'boolean') return status;
    const normalized = String(status).trim().toLowerCase();
    return ['已发布', '发布', 'published', 'online', '1', 'true'].includes(normalized) || status === '已发布';
  },

  onLoad() {
    console.log('[HealthInfo] onLoad');
    this.fetchArticles();
  },

  onShow() {
    console.log('[HealthInfo] onShow');
    this.fetchArticles();
  },

  async fetchArticles() {
    wx.showLoading({ title: '加载中' });
    try {
      // 读取最近文章后在前端做发布态兼容过滤：
      // 老数据可能没有 status 字段，或使用了不同状态值，直接 where(status='已发布') 会导致患者端看不到文章
      const rawData = await call('listArticles', { limit: 50 }) || [];
      const data = rawData.filter(item => this.isPublishedArticle(item));

      let hotArticle = null;
      if (data.length > 0) {
        // 找出浏览量最高的作为热门推荐，或者直接拿第一篇
        hotArticle = [...data].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
        // 将内容摘要化
        if (hotArticle && hotArticle.content) {
          hotArticle.description = hotArticle.content.replace(/<[^>]*>?/gm, '').substring(0, 50) + '...';
        }
      }

      this.setData({ articles: data, hotArticle, loading: false }, () => {
        this.filterArticles();
        wx.hideLoading();
      });
    } catch (err) {
      console.error('Failed to fetch articles:', err);
      this.setData({ loading: false });
      wx.hideLoading();
      wx.showToast({ title: '获取数据失败', icon: 'none' });
    }
  },

  onCategoryTap(e) {
    const { category } = e.currentTarget.dataset;
    this.setData({ activeCategory: category });
    this.filterArticles();
  },

  filterArticles() {
    const { articles, activeCategory } = this.data;
    let filtered = [...articles];

    // 按分类筛选
    if (activeCategory !== '全部') {
      filtered = filtered.filter(item => item.category === activeCategory);
    }

    this.setData({ filteredArticles: filtered });
  },

  onArticleTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/packages/resources/article/index?id=${id}` });
  },

  onHotArticleTap() {
    if (this.data.hotArticle) {
      const id = this.data.hotArticle._id;
      wx.navigateTo({ url: `/packages/resources/article/index?id=${id}` });
    }
  }
});
