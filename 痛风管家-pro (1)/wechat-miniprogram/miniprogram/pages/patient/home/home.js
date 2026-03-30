const app = getApp()

Page({
    data: {
        userInfo: null,
        uaLevel: 420,
        uaStatus: 'High',
        todayWater: 0,
        waterGoal: 2000,
        tasks: [
            { id: 1, title: '记录今日尿酸', completed: false, points: 10 },
            { id: 2, title: '阅读一篇科普文章', completed: true, points: 5 },
            { id: 3, title: '完成饮水目标', completed: false, points: 10 }
        ],
        articles: []
    },

    onLoad: function () {
        this.fetchData();
    },

    fetchData: async function () {
        wx.showLoading({ title: '加载中...' });
        try {
            // Fetch UA Logs
            const uaRes = await wx.cloud.callFunction({
                name: 'logFunctions',
                data: { type: 'getUALogs' }
            });

            if (uaRes.result.success && uaRes.result.data.length > 0) {
                const latest = uaRes.result.data[0];
                this.setData({
                    uaLevel: latest.value,
                    uaStatus: latest.status
                });
            }

            // Fetch Water
            const waterRes = await wx.cloud.callFunction({
                name: 'waterFunctions',
                data: { type: 'getTodayWater' }
            });

            if (waterRes.result.success) {
                this.setData({
                    todayWater: waterRes.result.data.current,
                    waterGoal: waterRes.result.data.goal
                });
            }

            // Fetch Articles
            const articleRes = await wx.cloud.callFunction({
                name: 'articleFunctions',
                data: {}
            });

            if (articleRes.result.success) {
                this.setData({
                    articles: articleRes.result.data.slice(0, 3) // Show top 3
                });
            }

        } catch (e) {
            console.error(e);
            wx.showToast({ title: '加载失败', icon: 'none' });
        } finally {
            wx.hideLoading();
        }
    },

    onTapLogUA: function () {
        wx.navigateTo({ url: '/pages/patient/log/log?type=ua' });
    },

    onTapLogAttack: function () {
        wx.navigateTo({ url: '/pages/patient/log/log?type=attack' });
    },

    onTapDiet: function () {
        wx.navigateTo({ url: '/pages/patient/diet/diet' });
    },

    onTapWater: function () {
        wx.navigateTo({ url: '/pages/patient/water/water' });
    },

    onTapArticle: function (e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/pages/article/article?id=${id}` });
    },

    onSwitchRole: function () {
        wx.reLaunch({
            url: '/pages/index/index',
        })
    }
})
