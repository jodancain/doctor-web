const { success, error } = require('../utils/response');

async function login(context) {
  const { db, openid, username, password } = context;
  const usersRef = db.collection('users');

  // ----------------------------------------------------------------
  // [CRITICAL CHANGE]
  // 优先级调整：如果提供了用户名/密码，优先处理账号密码登录，
  // 以便用户能够“强制”切换身份（例如从已自动绑定的患者号切到医生号）。
  // ----------------------------------------------------------------

  if (username && password) {
    const userRes = await usersRef.where({ username, password }).get();
    if (userRes.data.length > 0) {
      const targetUser = userRes.data[0];
      
      // 检查 targetUser 是否是当前用户自己（通过 openid 判断）
      if (targetUser._openid === openid) {
        // 是同一个账号，直接返回成功
        await usersRef.doc(targetUser._id).update({ data: { lastLoginAt: db.serverDate() } });
        return success(targetUser);
      }

      // 如果不是同一个账号，说明用户想登录另一个账号
      // 我们需要处理“抢占绑定”逻辑

      // 1. 检查目标账号是否已被【其他】真实 OpenID 绑定
      // (mock_ 开头视为未绑定，空值视为未绑定)
      const isTargetBound = targetUser._openid && !targetUser._openid.startsWith('mock_');
      
      if (isTargetBound) {
        // 严格模式：不允许抢占已被他人绑定的账号
        return error(403, 'Account already bound to another WeChat user');
      }

      // 2. [关键步骤] 解绑当前 OpenID 可能绑定的【旧账号】
      // 防止一个 OpenID 对应多个账号，导致下次自动登录查询出错
      const oldBindRes = await usersRef.where({ _openid: openid }).get();
      if (oldBindRes.data.length > 0) {
        const oldUser = oldBindRes.data[0];
        // 只有当旧账号不是我们要登录的目标账号时才解绑
        if (oldUser._id !== targetUser._id) {
          await usersRef.doc(oldUser._id).update({
            data: {
              // 将旧账号的 openid 重置为 mock 值，释放绑定
              _openid: `mock_detached_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
            }
          });
        }
      }

      // 3. 绑定新账号
      await usersRef.doc(targetUser._id).update({
        data: {
          _openid: openid,
          lastLoginAt: db.serverDate()
        }
      });

      return success({ ...targetUser, _openid: openid });
    }
  }

  // ----------------------------------------------------------------
  // 如果没有提供用户名密码，或者用户名密码错误（但前端校验了非空），
  // 则尝试默认的 OpenID 自动登录
  // ----------------------------------------------------------------
  
  const { data } = await usersRef.where({ _openid: openid }).get();
  
  if (data.length > 0) {
    // 更新最后登录时间
    await usersRef.doc(data[0]._id).update({
      data: { lastLoginAt: db.serverDate() }
    });
    return success(data[0]);
  }

  // 3. 用户不存在
  return { code: 404, msg: 'User not found', data: null };
}

async function register(context) {
  const { db, openid, username, password, nickName, role, doctorCode } = context;
  
  // 简单的参数校验
  if (!username || !password) {
    return error(400, 'Username and password are required');
  }

  if (role === 'doctor' && doctorCode !== '18736') {
    return error(403, 'Invalid doctor code');
  }

  const usersRef = db.collection('users');
  
  // 检查用户名是否重复
  const { total } = await usersRef.where({ username }).count();
  if (total > 0) {
    return error(409, 'Username already exists');
  }

  // 检查该 openid 是否已注册
  // 注意：注册新号前，最好也检查一下是否需要解绑旧号，
  // 但通常注册是针对新用户的。如果同一个微信要注册两个号，逻辑会比较复杂。
  // 这里保持现状，允许 OpenID 冲突检查（一个微信只能注册一个号）。
  const existUser = await usersRef.where({ _openid: openid }).get();
  if (existUser.data.length > 0) {
    return error(409, 'User already registered with this WeChat account');
  }

  const newUser = {
    _openid: openid,
    username,
    password, // 生产环境应加密
    nickName: nickName || username,
    role: role || 'user',
    avatar: '', // 初始为空
    createdAt: db.serverDate(),
    lastLoginAt: db.serverDate(),
  };

  // 补充医生特定字段
  if (role === 'doctor') {
    newUser.title = '主治医师'; // 默认
    newUser.hospital = '互联网医院'; // 默认
    newUser.badge = '认证医生';
  }

  const res = await usersRef.add({ data: newUser });
  return success({ ...newUser, _id: res._id });
}

async function updateProfile(context) {
  const { db, openid, ...dataToUpdate } = context;
  // 过滤掉敏感字段
  delete dataToUpdate.action;
  delete dataToUpdate.openid;
  delete dataToUpdate.appid;
  delete dataToUpdate.unionid;
  delete dataToUpdate.db;
  delete dataToUpdate._;
  delete dataToUpdate.$;

  const usersRef = db.collection('users');
  
  // 只能更新自己的资料
  const user = await usersRef.where({ _openid: openid }).get();
  if (user.data.length === 0) {
    return error(404, 'User not found');
  }

  await usersRef.where({ _openid: openid }).update({
    data: dataToUpdate
  });

  return success(dataToUpdate);
}

async function listDoctors(context) {
  const { db } = context;
  // 获取所有医生列表
  const { data } = await db.collection('users')
    .where({ role: 'doctor' })
    .field({
      password: 0, // 不返回密码
      // username: 0  <-- 保留 username 以作为 nickName 缺失时的 fallback
    })
    .get();
  
  return success(data);
}

async function getDoctorInfo(context) {
    const { db, doctorOpenid } = context;
    if (!doctorOpenid) return error(400, 'doctorOpenid required');

    const { data } = await db.collection('users')
        .where({ _openid: doctorOpenid, role: 'doctor' })
        .field({ password: 0 })
        .get();

    return success(data[0] || {});
}

async function getDoctorPatients(context) {
  const { db, openid } = context;

  // 1. Confirm current user is a doctor
  const { data: doctorData } = await db.collection('users').where({ _openid: openid, role: 'doctor' }).get();
  if (doctorData.length === 0) {
    return error(403, 'Permission denied');
  }
  
  // 2. 查询患者：兼容 role 为 user / patient / 历史未填 role 的账号（仅排除医生）
  // 仅 where({ role: 'user' }) 会漏掉旧数据或不同枚举值，导致医生端列表为空
  const { data: allUsers } = await db.collection('users').limit(100).get();
  const users = (allUsers || []).filter((u) => u && u.role !== 'doctor').slice(0, 50);
  
  const mockUaStatuses = ['Normal', 'High', 'Critical'];
  const mockGenders = ['男', '女'];
  
  // 3. Construct patient list by combining DB users with mock health data for demonstration
  const patients = users.map((user, index) => {
    const status = mockUaStatuses[index % mockUaStatuses.length];
    let uaValue = 300;
    if (status === 'High') uaValue = 420 + (index * 10);
    if (status === 'Critical') uaValue = 500 + (index * 20);
    
    const name = user.nickName || user.username || `患者${index + 1}`;
    
    return {
      id: user._openid || user._id,
      openid: user._openid,
      name: name,
      gender: mockGenders[index % 2],
      age: 30 + (index * 5),
      ua: uaValue,
      lastVisit: index === 0 ? '今天' : `${index}天前`,
      status: status
    };
  });

  return success(patients);
}

async function getDoctorPatientOverview(context) {
  const { db, openid, patientOpenid } = context;

  // 1. Confirm current user is a doctor
  const { data: doctorData } = await db.collection('users').where({ _openid: openid, role: 'doctor' }).get();
  if (doctorData.length === 0) {
    return error(403, 'Permission denied');
  }

  // 2. Fetch the specific patient
  const { data: patientData } = await db.collection('users').where({ _openid: patientOpenid }).get();
  if (patientData.length === 0) {
    return error(404, 'Patient not found');
  }

  const patient = patientData[0];
  const name = patient.nickName || patient.username || '未知患者';
  
  // Create deterministic mock health data based on patient openid length or similar
  const idLen = patient._openid ? patient._openid.length : 10;
  const isHighRisk = idLen % 3 === 0;
  const uaValue = isHighRisk ? (450 + (idLen * 5)) : (300 + (idLen * 5));
  
  const patientOverview = {
    id: patient._openid,
    name: name,
    gender: idLen % 2 === 0 ? '男' : '女',
    age: 30 + (idLen % 20),
    bmi: 24.5 + (idLen % 5),
    diagnosis: isHighRisk ? '痛风性关节炎 (急性期)' : '高尿酸血症',
    tags: isHighRisk ? ['高危', '依从性差'] : ['正常', '按时服药'],
    summary: {
      currentUA: uaValue,
      targetUA: 360,
      medication: '非布司他片',
      compliance: isHighRisk ? '偶尔漏服' : '坚持服用'
    }
  };

  return success(patientOverview);
}

async function getDoctorDashboardStats(context) {
  const { db, openid } = context;

  // 1. Confirm current user is a doctor
  const { data: doctorData } = await db.collection('users').where({ _openid: openid, role: 'doctor' }).get();
  if (doctorData.length === 0) {
    return error(403, 'Permission denied');
  }

  // 2. 统计患者数（与 getDoctorPatients 一致：非医生账号均视为患者）
  const { data: allUsers } = await db.collection('users').limit(200).get();
  const users = (allUsers || []).filter((u) => u && u.role !== 'doctor');
  const totalPatients = users.length;
  
  // Randomly assign some high risk counts based on patient count for demonstration
  const highRiskCount = Math.floor(totalPatients * 0.15) || 0;
  const activePatients = Math.floor(totalPatients * 0.6) || 0;
  const controlRate = 85;

  // 3. Generate some random TODOs using real patient names from DB
  const todos = [];
  if (users.length > 0) {
    // Pick first 3 users to generate task
    const sampleUsers = users.slice(0, 3);
    sampleUsers.forEach((u, idx) => {
      let title = '';
      let type = 'normal';
      
      if (idx === 0) {
        title = '审核高危患者化验单';
        type = 'urgent';
      } else if (idx === 1) {
        title = '痛风发作随访';
        type = 'normal';
      } else {
        title = '回复咨询消息';
        type = 'normal';
      }

      todos.push({
        id: idx + 1,
        title: title,
        patientName: u.nickName || u.username || `患者${idx + 1}`,
        patientOpenid: u._openid,
        deadline: '今日截止',
        type: type
      });
    });
  }

  return success({
    stats: {
      totalPatients: totalPatients,
      activePatients: activePatients,
      controlRate: controlRate,
      controlRateTrend: 2,
      highRiskCount: highRiskCount
    },
    todos: todos
  });
}

module.exports = {
  login,
  register,
  updateProfile,
  listDoctors,
  getDoctorInfo,
  getDoctorPatients,
  getDoctorPatientOverview,
  getDoctorDashboardStats
};
