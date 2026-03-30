const userService = require('./services/user-service');
const chatService = require('./services/chat-service');
const recordService = require('./services/record-service');
const aiService = require('./services/ai-service');
const { success, error } = require('./utils/response');

/**
 * 请求分发处理器
 * @param {Object} context - 请求上下文，包含 event 和 wxContext 信息
 */
async function handleRequest(context) {
  const { action } = context;

  try {
    switch (action) {
      // User Actions
      case 'login':
        return await userService.login(context);
      case 'register':
        return await userService.register(context);
      case 'updateProfile':
        return await userService.updateProfile(context);
      case 'listDoctors':
        return await userService.listDoctors(context);
      case 'getDoctorInfo':
        return await userService.getDoctorInfo(context);
      case 'getDoctorPatients':
        return await userService.getDoctorPatients(context);
      case 'getDoctorPatientOverview':
        return await userService.getDoctorPatientOverview(context);
      case 'getDoctorDashboardStats':
        return await userService.getDoctorDashboardStats(context);

      // Chat Actions
      case 'fetchConversation':
        return await chatService.fetchConversation(context);
      case 'sendMessage':
        return await chatService.sendMessage(context);
      case 'listInbox':
        return await chatService.listInbox(context);
      case 'deleteConversation':
        return await chatService.deleteConversation(context);

      // Record Actions
      case 'addRecord':
        return await recordService.addRecord(context);
      case 'updateRecord':
        return await recordService.updateRecord(context);
      case 'deleteRecord':
        return await recordService.deleteRecord(context);
      case 'getRecords':
        return await recordService.getRecords(context);
      case 'getHomeSummary':
        return await recordService.getHomeSummary(context);
        
      // AI Actions
      case 'askAI':
        return await aiService.askAI(context);
        
      default:
        return error(400, `Unknown action: ${action}`);
    }
  } catch (err) {
    console.error(`[Handler Error] action: ${action}`, err);
    return error(500, err.message || 'Internal Server Error');
  }
}

module.exports = {
  handleRequest,
};
