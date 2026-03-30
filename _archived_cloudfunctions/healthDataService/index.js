const cloud = require('wx-server-sdk');
const { handleRequest } = require('./src/handler');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  
  // 将上下文信息注入 event
  const requestContext = {
    ...event,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
    db: cloud.database(),
    _: cloud.database().command,
    $: cloud.database().command.aggregate,
    cloud, // 注入 cloud 实例，以便 service 调用 getTempFileURL 等能力
  };

  return await handleRequest(requestContext);
};

