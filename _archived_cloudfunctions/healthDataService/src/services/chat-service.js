const { success, error } = require('../utils/response');

async function fetchConversation(context) {
  const { db, openid, _, targetOpenid, cloud } = context;
  
  if (!targetOpenid) {
    return error(400, 'targetOpenid is required');
  }

  // 获取双方基本信息
  const usersRef = db.collection('users');
  const [currentUserRes, targetUserRes] = await Promise.all([
    usersRef.where({ _openid: openid }).get(),
    usersRef.where({ _openid: targetOpenid }).get()
  ]);

  const currentUser = currentUserRes.data[0];
  const targetUser = targetUserRes.data[0];

  // 容错处理：如果有一方用户未找到，不直接报错，而是允许返回空消息列表
  const safeCurrentUser = currentUser || { 
    nickName: '当前用户', 
    username: 'unknown', 
    role: 'user', 
    _openid: openid 
  };
  
  const safeTargetUser = targetUser || { 
    nickName: '未知用户', 
    username: 'unknown', 
    role: 'user', 
    _openid: targetOpenid 
  };

  let doctor, patient;
  if (safeCurrentUser.role === 'doctor') {
    doctor = safeCurrentUser;
    patient = safeTargetUser;
  } else {
    doctor = safeTargetUser;
    patient = safeCurrentUser;
  }

  // 获取消息记录
  const messagesRef = db.collection('messages');
  const { data: messages } = await messagesRef
    .where(_.or([
      { fromOpenid: openid, toOpenid: targetOpenid },
      { fromOpenid: targetOpenid, toOpenid: openid }
    ]))
    .orderBy('createdAt', 'asc')
    .limit(100) // 限制最近 100 条
    .get();

  // [优化] 自动转换图片 fileID 为临时链接
  // 这解决了接收方因权限问题无法直接读取 cloud:// 路径图片的问题
  if (messages.length > 0 && cloud) {
    const fileList = messages
      .filter(msg => msg.msgType === 'image' && msg.content && msg.content.startsWith('cloud://'))
      .map(msg => msg.content);
    
    if (fileList.length > 0) {
      try {
        // 去重，避免重复请求
        const uniqueFileList = [...new Set(fileList)];
        const { fileList: tempFiles } = await cloud.getTempFileURL({
          fileList: uniqueFileList
        });
        
        const urlMap = {};
        tempFiles.forEach(file => {
          if (file.status === 0) {
            urlMap[file.fileID] = file.tempFileURL;
          }
        });
        
        messages.forEach(msg => {
          if (msg.msgType === 'image' && urlMap[msg.content]) {
            msg.tempUrl = urlMap[msg.content];
          }
        });
      } catch (err) {
        console.error('[ChatService] Get temp file URL failed', err);
      }
    }
  }

  return success({
    messages,
    doctor: {
      nickName: doctor.nickName,
      username: doctor.username,
      role: doctor.role,
      openid: doctor._openid
    },
    patient: {
      nickName: patient.nickName,
      username: patient.username,
      role: patient.role,
      openid: patient._openid
    }
  });
}

async function sendMessage(context) {
  const { db, openid, targetOpenid, content, msgType, clientMsgId } = context;

  if (!targetOpenid || !content) {
    return error(400, 'Missing required fields');
  }

  const normalizedMsgType = msgType === 'image' ? 'image' : 'text';
  const normalizedContent = typeof content === 'string' ? content.trim() : content;

  if (!normalizedContent) {
    return error(400, 'Content cannot be empty');
  }

  if (clientMsgId) {
    // 幂等处理：如果同一客户端消息已存在则直接返回，避免重复写入
    const { data: existing } = await db.collection('messages')
      .where({ clientMsgId, fromOpenid: openid })
      .limit(1)
      .get();

    if (existing.length > 0) {
      return success(existing[0]);
    }
  }

  const message = {
    fromOpenid: openid,
    toOpenid: targetOpenid,
    content: normalizedContent,
    msgType: normalizedMsgType, // 默认文本
    createdAt: Date.now(),
    read: false,
    status: 'success',
    clientMsgId: clientMsgId || undefined,
  };

  const res = await db.collection('messages').add({ data: message });

  return success({
    ...message,
    _id: res._id
  });
}

async function listInbox(context) {
  const { db, openid, _, cloud } = context;
  const $ = db.command.aggregate;
  
  // Debug Log
  console.log('[listInbox] Start for openid:', openid);

  const { list: conversations } = await db.collection('messages')
    .aggregate()
    .match(_.or([
      { fromOpenid: openid },
      { toOpenid: openid }
    ]))
    .sort({ createdAt: -1 })
    .group({
      _id: {
        partnerOpenid: $.cond({
          if: $.eq(['$fromOpenid', openid]),
          then: '$toOpenid',
          else: '$fromOpenid'
        })
      },
      latestMessage: $.first('$$ROOT')
    })
    .replaceRoot({
      newRoot: '$latestMessage'
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .end();

  // Debug Log
  console.log('[listInbox] Raw conversations:', JSON.stringify(conversations, null, 2));

  if (conversations.length === 0) {
    return success([]);
  }

  // 自动过滤掉 mock_detached_ 开头的无效会话（已解绑的旧账号）
  // 2025-11-30: 暂时注释掉此过滤逻辑，以便在真机调试时能看到与模拟器临时账号的会话
  const validConversations = conversations; // conversations.filter(msg => {
  //   const partnerOpenid = msg.fromOpenid === openid ? msg.toOpenid : msg.fromOpenid;
  //   return partnerOpenid && !partnerOpenid.startsWith('mock_detached_');
  // });

  // 如果过滤后为空，直接返回空数组
  if (validConversations.length === 0) {
    return success([]);
  }

  const partnerOpenids = validConversations.map(msg => 
    msg.fromOpenid === openid ? msg.toOpenid : msg.fromOpenid
  );

  const { data: partners } = await db.collection('users')
    .where({ _openid: _.in(partnerOpenids) })
    .field({
      _openid: 1,
      nickName: 1,
      avatar: 1,
      role: 1,
      username: 1
    })
    .get();

  // Debug Log
  console.log('[listInbox] Found partners:', JSON.stringify(partners, null, 2));

  const partnerMap = {};
  partners.forEach(p => {
    partnerMap[p._openid] = p;
  });

  const result = validConversations.map(msg => {
    const partnerOpenid = msg.fromOpenid === openid ? msg.toOpenid : msg.fromOpenid;
    const partner = partnerMap[partnerOpenid] || { nickName: '未知用户', _openid: partnerOpenid };
    
    return {
      partnerOpenid,
      partnerName: partner.nickName || partner.username || '未知用户',
      partnerAvatar: partner.avatar,
      partnerRole: partner.role,
      lastContent: msg.msgType === 'image' ? '[图片]' : msg.content,
      lastTime: msg.createdAt,
      unread: 0,
      isMock: partnerOpenid && partnerOpenid.startsWith('mock_detached_')
    };
  });

  return success(result);
}

async function deleteConversation(context) {
  const { db, openid, _, targetOpenid } = context;

  if (!targetOpenid) {
    return error(400, 'targetOpenid is required');
  }

  const messagesRef = db.collection('messages');
  
  try {
    await messagesRef.where(_.or([
      { fromOpenid: openid, toOpenid: targetOpenid },
      { fromOpenid: targetOpenid, toOpenid: openid }
    ])).remove();

    return success({ deleted: true });
  } catch (err) {
    return error(500, 'Failed to delete conversation');
  }
}

module.exports = {
  fetchConversation,
  sendMessage,
  listInbox,
  deleteConversation
};
