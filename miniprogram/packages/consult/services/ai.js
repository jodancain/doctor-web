const { call } = require('../../../utils/request');

/**
 * 请求 AI 回复
 * @param {Array} history - 用户历史对话数组
 */
const askAI = async (history) => {
  return await call('askAI', { history });
};

module.exports = {
  askAI
};