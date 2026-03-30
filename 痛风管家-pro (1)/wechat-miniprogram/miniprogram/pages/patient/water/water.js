const app = getApp()

Page({
    data: {
        current: 0,
        goal: 2000,
        percentage: 0,
        records: [],
        containers: [
            { type: 'cup', amount: 200, icon: '🥛', name: '一杯水' },
            { type: 'bottle', amount: 500, icon: '🧴', name: '一瓶水' },
            { type: 'coffee', amount: 350, icon: '☕', name: '咖啡' },
            { type: 'drink', amount: 330, icon: '🥤', name: '饮料' }
        ]
    },

    onLoad: function () {
        this.fetchWater();
    },

    fetchWater: async function () {
        try {
            const res = await wx.cloud.callFunction({
                name: 'waterFunctions',
                data: { type: 'getTodayWater' }
            });

            if (res.result.success) {
                const { current, goal, records } = res.result.data;
                const percentage = Math.min(Math.round((current / goal) * 100), 100);

                this.setData({
                    current,
                    goal,
                    records,
                    percentage
                });
            }
        } catch (e) {
            console.error(e);
        }
    },

    addWater: async function (e) {
        const item = e.currentTarget.dataset.item;

        wx.showLoading({ title: '记录中' });
        try {
            await wx.cloud.callFunction({
                name: 'waterFunctions',
                data: {
                    type: 'addWater',
                    data: {
                        amount: item.amount,
                        type: item.type
                    }
                }
            });

            wx.showToast({ title: '已记录' });
            this.fetchWater();

        } catch (e) {
            console.error(e);
            wx.showToast({ title: '记录失败', icon: 'none' });
        } finally {
            wx.hideLoading();
        }
    }
})
