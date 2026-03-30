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
        if (type === 'getProfile') {
            const res = await db.collection('users').where({
                _openid: openid
            }).get()

            if (res.data.length > 0) {
                return { success: true, data: res.data[0] }
            } else {
                return { success: false, msg: 'User not found' }
            }
        }

        else if (type === 'createProfile') {
            // Check if user exists
            const check = await db.collection('users').where({
                _openid: openid
            }).get()

            if (check.data.length > 0) {
                return { success: true, data: check.data[0], msg: 'User already exists' }
            }

            const newUser = {
                _openid: openid,
                ...data,
                createdAt: db.serverDate()
            }

            await db.collection('users').add({
                data: newUser
            })

            return { success: true, data: newUser }
        }

        else if (type === 'updateProfile') {
            await db.collection('users').where({
                _openid: openid
            }).update({
                data: {
                    ...data,
                    updatedAt: db.serverDate()
                }
            })
            return { success: true }
        }

        return { success: false, msg: 'Unknown type' }

    } catch (e) {
        console.error(e)
        return { success: false, error: e }
    }
}
