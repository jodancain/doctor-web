const { call } = require('../../../utils/request');

/**
 * 获取会话列表 (收件箱)
 */
const listInbox = async () => {
  return await call('listInbox');
};

/**
 * 获取指定会话的消息记录
 * @param {string} targetOpenid - 对方的 OpenID
 */
const fetchConversation = async (targetOpenid) => {
  return await call('fetchConversation', { targetOpenid });
};

/**
 * 发送消息
 * @param {Object} params
 * @param {string} params.targetOpenid - 接收者 OpenID
 * @param {string} params.content - 消息内容 (文本或 fileID)
 * @param {string} params.msgType - 消息类型 'text' | 'image'
 * @param {string} [params.clientMsgId] - 客户端生成的消息 ID (用于幂等去重)
 */
const sendMessage = async (params) => {
  return await call('sendMessage', params);
};

/**
 * 删除会话
 * @param {string} targetOpenid - 对方的 OpenID
 */
const deleteConversation = async (targetOpenid) => {
  return await call('deleteConversation', { targetOpenid });
};

/**
 * 获取医生绑定的患者列表
 */
const listDoctorPatients = async () => {
  return await call('listDoctorPatients');
};

/**
 * 获取云端患者列表
 */
const getDoctorPatientsList = async () => {
  return await call('getDoctorPatients');
};

/**
 * 获取医生视角的患者概览
 * @param {string} patientOpenid - 患者 OpenID
 */
const getDoctorPatientOverview = async (patientOpenid) => {
  return await call('getDoctorPatientOverview', { patientOpenid });
};

/**
 * 获取云端工作台数据
 */
const getDoctorDashboardStats = async () => {
  return await call('getDoctorDashboardStats');
};

module.exports = {
  listInbox,
  fetchConversation,
  sendMessage,
  deleteConversation,
  listDoctorPatients,
  getDoctorPatientsList,
  getDoctorPatientOverview,
  getDoctorDashboardStats
};

