const app = getApp()

Page({
    data: {
        type: 'ua', // 'ua' or 'attack'
        date: '',
        time: '',

        // UA Data
        uaValue: '',

        // Attack Data
        bodyPart: '',
        painLevel: 5,
        triggers: [],
        triggerOptions: ['高嘌呤饮食', '饮酒', '受凉', '剧烈运动', '熬夜', '未知'],

        submitting: false
    },

    onLoad: function (options) {
        const type = options.type || 'ua';
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().slice(0, 5);

        this.setData({
            type,
            date,
            time
        });

        wx.setNavigationBarTitle({
            title: type === 'ua' ? '记录尿酸' : '记录发作'
        });
    },

    bindDateChange: function (e) {
        this.setData({ date: e.detail.value });
    },

    bindTimeChange: function (e) {
        this.setData({ time: e.detail.value });
    },

    // UA Handlers
    onUAInput: function (e) {
        this.setData({ uaValue: e.detail.value });
    },

    // Attack Handlers
    onBodyPartInput: function (e) {
        this.setData({ bodyPart: e.detail.value });
    },

    onPainChange: function (e) {
        this.setData({ painLevel: e.detail.value });
    },

    toggleTrigger: function (e) {
        const trigger = e.currentTarget.dataset.item;
        const triggers = this.data.triggers;
        const index = triggers.indexOf(trigger);

        if (index > -1) {
            triggers.splice(index, 1);
        } else {
            triggers.push(trigger);
        }

        this.setData({ triggers });
    },

    submit: async function () {
        if (this.data.submitting) return;

        if (this.data.type === 'ua' && !this.data.uaValue) {
            wx.showToast({ title: '请输入尿酸值', icon: 'none' });
            return;
        }

        if (this.data.type === 'attack' && !this.data.bodyPart) {
            wx.showToast({ title: '请输入发作部位', icon: 'none' });
            return;
        }

        this.setData({ submitting: true });
        wx.showLoading({ title: '保存中...' });

        try {
            if (this.data.type === 'ua') {
                await wx.cloud.callFunction({
                    name: 'logFunctions',
                    data: {
                        type: 'addUALog',
                        data: {
                            value: Number(this.data.uaValue),
                            date: this.data.date,
                            time: this.data.time
                        }
                    }
                });
            } else {
                await wx.cloud.callFunction({
                    name: 'logFunctions',
                    data: {
                        type: 'addAttackRecord',
                        data: {
                            date: this.data.date,
                            bodyPart: this.data.bodyPart,
                            painLevel: this.data.painLevel,
                            triggers: this.data.triggers
                        }
                    }
                });
            }

            wx.showToast({ title: '保存成功' });
            setTimeout(() => {
                wx.navigateBack();
            }, 1500);

        } catch (e) {
            console.error(e);
            wx.showToast({ title: '保存失败', icon: 'none' });
        } finally {
            this.setData({ submitting: false });
            wx.hideLoading();
        }
    }
})
