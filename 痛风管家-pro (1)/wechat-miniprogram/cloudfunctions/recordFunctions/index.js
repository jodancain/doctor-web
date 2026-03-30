const cloud = require('wx-server-sdk')

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const { type, data, id } = event

    try {
        if (type === 'getRecords') {
            const res = await db.collection('medical_records').where({
                _openid: openid
            }).orderBy('date', 'desc').get()
            return { success: true, data: res.data }
        }

        else if (type === 'addRecord') {
            const res = await db.collection('medical_records').add({
                data: {
                    _openid: openid,
                    ...data,
                    createdAt: db.serverDate()
                }
            })
            return { success: true, id: res._id }
        }

        else if (type === 'updateRecord') {
            await db.collection('medical_records').doc(id).update({
                data: {
                    ...data,
                    updatedAt: db.serverDate()
                }
            })
            return { success: true }
        }

        else if (type === 'deleteRecord') {
            await db.collection('medical_records').doc(id).remove()
            return { success: true }
        }

        return { success: false, msg: 'Unknown type' }

    } catch (e) {
        console.error(e)
        return { success: false, error: e }
    }
}
