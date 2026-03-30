const { success, error } = require('../utils/response.cjs');
const bcrypt = require('bcrypt');

// 去除敏感字段后返回用户对象
function safeUser(user) {
  if (!user) return user;
  const { password, ...safe } = user;
  return safe;
}

async function login(context) {
  const { db, openid, username, password } = context;
  const usersRef = db.collection('users');

  // ----------------------------------------------------------------
  // [CRITICAL CHANGE]
  // 优先级调整：如果提供了用户名/密码，优先处理账号密码登录，
  // 以便用户能够”强制”切换身份（例如从已自动绑定的患者号切到医生号）。
  // ----------------------------------------------------------------

  if (username && password) {
    const userRes = await usersRef.where({ username }).limit(1).get();
    if (userRes.data.length > 0) {
      const targetUser = userRes.data[0];

      // 密码验证：支持 bcrypt 和明文（自动迁移）
      const dbPassword = String(targetUser.password);
      let isMatch = false;
      if (dbPassword.startsWith('$2b$')) {
        isMatch = await bcrypt.compare(password, dbPassword);
      } else {
        isMatch = password === dbPassword;
        if (isMatch) {
          const hashed = await bcrypt.hash(password, 10);
          await usersRef.doc(targetUser._id).update({ password: hashed });
        }
      }

      if (!isMatch) {
        return error(401, 'Invalid username or password');
      }
      
      // 检查 targetUser 是否是当前用户自己（通过 openid 判断）
      if (targetUser._openid === openid) {
        // 是同一个账号，直接返回成功
        await usersRef.doc(targetUser._id).update({ lastLoginAt: db.serverDate() });
        return success(safeUser(targetUser));
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
            // 将旧账号的 openid 重置为 mock 值，释放绑定
            _openid: `mock_detached_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
          });
        }
      }

      // 3. 绑定新账号
      await usersRef.doc(targetUser._id).update({
        _openid: openid,
        lastLoginAt: db.serverDate()
      });

      return success(safeUser({ ...targetUser, _openid: openid }));
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
      lastLoginAt: db.serverDate()
    });
    return success(safeUser(data[0]));
  }

  // 3. 用户不存在
  return error(404, 'User not found');
}

async function register(context) {
  const { db, openid, username, password, nickName, role, doctorCode } = context;
  
  // 简单的参数校验
  if (!username || !password) {
    return error(400, 'Username and password are required');
  }

  const validDoctorCode = process.env.DOCTOR_REGISTER_CODE;
  if (role === 'doctor' && (!validDoctorCode || doctorCode !== validDoctorCode)) {
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

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    _openid: openid,
    username,
    password: hashedPassword,
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

  const res = await usersRef.add(newUser);
  return success(safeUser({ ...newUser, _id: res._id }));
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

  await usersRef.where({ _openid: openid }).update(dataToUpdate);

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
  const { db, openid, _ } = context;

  // 1. Confirm current user is a doctor（兼容大小写、数据迁移后 openid 变更场景）
  const { data: userByOpenid } = await db.collection('users').where({ _openid: openid }).limit(1).get();
  if (userByOpenid.length === 0) {
    return error(403, '当前微信未绑定任何账号，请先登录');
  }
  const currentRole = String(userByOpenid[0].role || '').toLowerCase();
  if (currentRole !== 'doctor') {
    return error(403, '当前账号不是医生角色');
  }

  // 2. 查询患者：排除医生，兼容 role 为 user / patient / 缺失 role / 大小写不一致
  // 仅 where({ role: 'user' }) 会漏掉历史数据，导致医生端“无患者可见”
  const { data: allUsers } = await db.collection('users')
    .where({ role: _.neq('doctor') })
    .limit(200)
    .get();
  const users = (allUsers || []).filter((u) => {
    const role = String(u.role || '').toLowerCase();
    // 仅保留可用于详情查询的账号（必须有 _openid）
    return role !== 'doctor' && !!u._openid;
  });
  
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

  // 1. Confirm current user is a doctor（兼容大小写）
  const { data: userByOpenid } = await db.collection('users').where({ _openid: openid }).limit(1).get();
  if (userByOpenid.length === 0 || String(userByOpenid[0].role || '').toLowerCase() !== 'doctor') {
    return error(403, 'Permission denied');
  }

  // 2. Fetch the specific patient（仅允许查看非医生账号）
  const { data: patientData } = await db.collection('users').where({ _openid: patientOpenid }).get();
  if (patientData.length === 0) {
    return error(404, 'Patient not found');
  }

  const patient = patientData[0];
  const patientRole = String(patient.role || '').toLowerCase();
  if (patientRole === 'doctor') {
    return error(400, 'Invalid patient id');
  }
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
  const { db, openid, _ } = context;

  // 1. Confirm current user is a doctor（兼容大小写）
  const { data: userByOpenid } = await db.collection('users').where({ _openid: openid }).limit(1).get();
  if (userByOpenid.length === 0 || String(userByOpenid[0].role || '').toLowerCase() !== 'doctor') {
    return error(403, 'Permission denied');
  }

  // 2. 统计患者数（与患者列表口径保持一致：排除医生）
  const { data: allUsers } = await db.collection('users')
    .where({ role: _.neq('doctor') })
    .limit(500)
    .get();
  const users = (allUsers || []).filter((u) => {
    const role = String(u.role || '').toLowerCase();
    return role !== 'doctor' && !!u._openid;
  });
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
