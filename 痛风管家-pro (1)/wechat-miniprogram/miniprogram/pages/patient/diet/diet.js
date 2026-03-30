const app = getApp()

Page({
    data: {
        foods: [],
        todayLogs: [],
        totalCalories: 0,
        searchQuery: '',
        selectedMeal: 'breakfast',
        meals: [
            { id: 'breakfast', name: '早餐' },
            { id: 'lunch', name: '午餐' },
            { id: 'dinner', name: '晚餐' },
            { id: 'snack', name: '加餐' }
        ]
    },

    onLoad: function () {
        this.fetchFoods();
        this.fetchTodayLogs();
    },

    fetchFoods: async function () {
        try {
            const res = await wx.cloud.callFunction({
                name: 'dietFunctions',
                data: { type: 'getFoodDatabase' }
            });
            if (res.result.success) {
                this.setData({ foods: res.result.data });
            }
        } catch (e) {
            console.error(e);
        }
    },

    fetchTodayLogs: async function () {
        const today = new Date().toISOString().split('T')[0];
        try {
            const res = await wx.cloud.callFunction({
                name: 'dietFunctions',
                data: {
                    type: 'getDietLogs',
                    date: today
                }
            });
            if (res.result.success) {
                const logs = res.result.data;
                const total = logs.reduce((sum, log) => sum + log.calories, 0);
                this.setData({
                    todayLogs: logs,
                    totalCalories: total
                });
            }
        } catch (e) {
            console.error(e);
        }
    },

    onSearch: function (e) {
        this.setData({ searchQuery: e.detail.value });
    },

    selectMeal: function (e) {
        this.setData({ selectedMeal: e.currentTarget.dataset.id });
    },

    addFood: async function (e) {
        const food = e.currentTarget.dataset.food;
        const today = new Date().toISOString().split('T')[0];

        wx.showLoading({ title: '添加中' });
        try {
            await wx.cloud.callFunction({
                name: 'dietFunctions',
                data: {
                    type: 'addDietLog',
                    data: {
                        date: today,
                        meal: this.data.selectedMeal,
                        foodId: food.id,
                        foodName: food.name,
                        amount: 1, // Default 1 serving
                        calories: food.calories,
                        purine: food.purine
                    }
                }
            });

            wx.showToast({ title: '已添加' });
            this.fetchTodayLogs();

        } catch (e) {
            console.error(e);
            wx.showToast({ title: '添加失败', icon: 'none' });
        } finally {
            wx.hideLoading();
        }
    }
})
