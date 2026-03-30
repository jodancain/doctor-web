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
        // --- Uric Acid Logs ---
        if (type === 'getUALogs') {
            const res = await db.collection('uric_acid_logs').where({
                _openid: openid
            }).orderBy('date', 'desc').get()
            return { success: true, data: res.data }
        }

        else if (type === 'addUALog') {
            let status = 'Normal';
            if (data.value > 420) status = 'High';
            if (data.value > 540) status = 'Critical';

            const res = await db.collection('uric_acid_logs').add({
                data: {
                    _openid: openid,
                    ...data,
                    status,
                    createdAt: db.serverDate()
                }
            })
            return { success: true, id: res._id, status }
        }

        // --- Attack Records ---
        else if (type === 'getAttackRecords') {
            const res = await db.collection('attack_records').where({
                _openid: openid
            }).orderBy('date', 'desc').get()
            return { success: true, data: res.data }
        }

        else if (type === 'addAttackRecord') {
            const res = await db.collection('attack_records').add({
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
