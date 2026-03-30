const cloud = require('wx-server-sdk')

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const { type, data } = event

    try {
        if (type === 'getTodayWater') {
            // Get today's date string YYYY-MM-DD
            const today = new Date().toISOString().split('T')[0]

            const res = await db.collection('water_logs').where({
                _openid: openid,
                date: today
            }).get()

            let current = 0;
            let records = [];

            if (res.data.length > 0) {
                // Aggregate records
                records = res.data;
                current = records.reduce((sum, record) => sum + record.amount, 0);
            }

            return {
                success: true,
                data: {
                    current,
                    goal: 2000, // Default goal
                    records
                }
            }
        }

        else if (type === 'addWater') {
            const today = new Date().toISOString().split('T')[0]
            const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })

            const res = await db.collection('water_logs').add({
                data: {
                    _openid: openid,
                    date: today,
                    time: time,
                    ...data,
                    createdAt: db.serverDate()
                }
            })

            // Return updated daily stats
            // In a real optimized app, we might just return the new record and let frontend update state
            return { success: true, id: res._id }
        }

        return { success: false, msg: 'Unknown type' }

    } catch (e) {
        console.error(e)
        return { success: false, error: e }
    }
}
