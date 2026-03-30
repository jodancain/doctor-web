const app = getApp()

Page({
    data: {
        doctorInfo: {
            name: '李医生',
            title: '主治医师',
            hospital: '第一人民医院',
            department: '风湿免疫科'
        },
        stats: {
            totalPatients: 128,
            activePatients: 45,
            controlRate: 85,
            highRiskCount: 12
        },
        patients: [
            { id: 'p1', name: '张三', age: 45, gender: '男', status: 'High', lastVisit: '2024-05-15' },
            { id: 'p2', name: '李四', age: 32, gender: '男', status: 'Normal', lastVisit: '2024-05-10' },
            { id: 'p3', name: '王五', age: 58, gender: '男', status: 'Critical', lastVisit: '2024-05-18' },
        ]
    },

    onLoad: function () {
        // In real app, fetch doctor profile and patient list from cloud
    },

    onSwitchRole: function () {
        wx.reLaunch({
            url: '/pages/index/index',
        })
    }
})
