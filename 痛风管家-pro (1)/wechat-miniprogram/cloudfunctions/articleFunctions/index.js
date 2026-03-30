const cloud = require('wx-server-sdk')

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// Mock Articles (In real app, stored in DB)
const MOCK_ARTICLES = [
    {
        id: '1',
        title: '痛风患者到底能不能吃豆制品？最新指南解读',
        category: '饮食',
        readTime: '3分钟',
        imageUrl: 'https://images.unsplash.com/photo-1511690656952-34342d5c71df?auto=format&fit=crop&q=80&w=400',
        views: 1205,
        isNew: true
    },
    {
        id: '2',
        title: '急性发作时的“黄金24小时”处理法则',
        category: '基础',
        readTime: '5分钟',
        imageUrl: 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&q=80&w=400',
        views: 3420
    },
    {
        id: '3',
        title: '非布司他 vs 别嘌醇：医生教你如何选择降酸药',
        category: '药物',
        readTime: '8分钟',
        imageUrl: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&q=80&w=400',
        views: 890
    },
    {
        id: '4',
        title: '每天喝多少水才能有效排酸？',
        category: '生活',
        readTime: '2分钟',
        imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&q=80&w=400',
        views: 2100
    },
    {
        id: '5',
        title: '低嘌呤饮食食谱推荐：好吃又不升酸',
        category: '饮食',
        readTime: '6分钟',
        imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=400',
        views: 1560
    },
];

exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()

    try {
        // In a real app, we would query the 'articles' collection
        // const res = await db.collection('articles').get()
        // return { success: true, data: res.data }

        return { success: true, data: MOCK_ARTICLES }

    } catch (e) {
        console.error(e)
        return { success: false, error: e }
    }
}
