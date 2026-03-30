const app = getApp()

Page({
    data: {
        article: null
    },

    onLoad: function (options) {
        const id = options.id;
        if (id) {
            this.fetchArticle(id);
        }
    },

    fetchArticle: async function (id) {
        wx.showLoading({ title: '加载中' });
        try {
            const res = await wx.cloud.callFunction({
                name: 'articleFunctions',
                data: {}
            });

            if (res.result.success) {
                const article = res.result.data.find(a => a.id === id);
                if (article) {
                    this.setData({ article });
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            wx.hideLoading();
        }
    }
})
