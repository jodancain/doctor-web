const cloud = require('wx-server-sdk')

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// Mock Food Database (In a real app, this would be a collection)
const MOCK_FOOD_DB = [
    { id: 'f1', name: '米饭', calories: 116, purine: 'Low', type: 'Staple' },
    { id: 'f2', name: '燕麦', calories: 389, purine: 'Medium', type: 'Staple' },
    { id: 'f3', name: '鸡胸肉', calories: 165, purine: 'Medium', type: 'Meat' },
    { id: 'f4', name: '猪肝', calories: 129, purine: 'High', type: 'Meat' },
    { id: 'f5', name: '基围虾', calories: 93, purine: 'High', type: 'Seafood' },
    { id: 'f6', name: '海带', calories: 13, purine: 'High', type: 'Seafood' },
    { id: 'f7', name: '西兰花', calories: 34, purine: 'Low', type: 'Veggie' },
    { id: 'f8', name: '菠菜', calories: 23, purine: 'Medium', type: 'Veggie' },
    { id: 'f9', name: '苹果', calories: 52, purine: 'Low', type: 'Fruit' },
    { id: 'f10', name: '牛奶', calories: 54, purine: 'Low', type: 'Snack' },
    { id: 'f11', name: '啤酒', calories: 43, purine: 'High', type: 'Snack' },
    { id: 'f12', name: '鸡蛋', calories: 143, purine: 'Low', type: 'Meat' },
];

exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const { type, data, date } = event

    try {
        if (type === 'getFoodDatabase') {
            // In real app, db.collection('foods').get()
            return { success: true, data: MOCK_FOOD_DB }
        }

        else if (type === 'getDietLogs') {
            const res = await db.collection('diet_logs').where({
                _openid: openid,
                date: date
            }).get()
            return { success: true, data: res.data }
        }

        else if (type === 'addDietLog') {
            const res = await db.collection('diet_logs').add({
                data: {
                    _openid: openid,
                    ...data,
                    createdAt: db.serverDate()
                }
            })
            return { success: true, id: res._id }
        }

        return { success: false, msg: 'Unknown type' }

    } catch (e) {
        console.error(e)
        return { success: false, error: e }
    }
}
