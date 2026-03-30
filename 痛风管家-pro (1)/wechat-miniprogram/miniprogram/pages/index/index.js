const app = getApp()

Page({
    data: {

    },

    onLoad: function () {

    },

    onChoosePatient: function () {
        app.globalData.role = 'patient';
        wx.navigateTo({
            url: '/pages/patient/home/home',
        })
    },

    onChooseDoctor: function () {
        app.globalData.role = 'doctor';
        wx.navigateTo({
            url: '/pages/doctor/home/home',
        })
    }
})
