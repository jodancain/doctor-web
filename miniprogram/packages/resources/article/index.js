const { call } = require('../../../../utils/request');

Page({
  data: {
    article: null,
    relatedArticles: [],
    loading: true
  },

  isPublishedArticle(article) {
    if (!article) return false;
    const status = article.status;
    if (status === undefined || status === null || status === '') return true;
    if (typeof status === 'boolean') return status;
    const normalized = String(status).trim().toLowerCase();
    return ['已发布', '发布', 'published', 'online', '1', 'true'].includes(normalized) || status === '已发布';
  },

  onLoad(options) {
    const id = options.id;
    if (id) {
      this.fetchArticleDetail(id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  async fetchArticleDetail(id) {
    wx.showLoading({ title: '加载中' });
    try {
      // getArticle 在后端同时完成阅读量+1
      const article = await call('getArticle', { id });
      if (article) {
        // 格式化发布时间
        if (article.createdAt) {
          const dateObj = new Date(article.createdAt);
          article.publishTime = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        }
        this.setData({ article, loading: false });

        // 获取相关推荐（同分类，最多3篇）
        try {
          const relatedRaw = await call('listArticles', {
            category: article.category,
            excludeId: id,
            limit: 20
          });
          const relatedPublished = (relatedRaw || [])
            .filter(item => this.isPublishedArticle(item))
            .slice(0, 3);
          this.setData({ relatedArticles: relatedPublished });
        } catch (e) {
          console.warn('Failed to fetch related articles', e);
        }
      } else {
        wx.showToast({ title: '文章不存在', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('Failed to fetch article detail:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    } finally {
      wx.hideLoading();
    }
  },

  onRelatedTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.redirectTo({ url: `/packages/resources/article/index?id=${id}` });
  },

  onShareAppMessage() {
    const { article } = this.data;
    return {
      title: article ? article.title : '健康知识库',
      path: article ? `/packages/resources/article/index?id=${article._id}` : `/pages/health-info/index`,
      imageUrl: article ? article.coverUrl : ''
    };
  }
});
