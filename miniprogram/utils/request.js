const app = getApp();

// API 基础地址：根据小程序运行环境自动切换
// - 开发版（develop）：本地开发服务器（需与电脑同一局域网，或使用 localhost + 不校验域名）
// - 体验版（trial）/ 正式版（release）：生产服务器（需在微信后台配置合法域名）
//
const ENV_VERSION = wx.getAccountInfoSync ? wx.getAccountInfoSync().miniProgram.envVersion : 'release';
const SERVER_URLS = {
  develop: 'http://localhost:3000',        // 开发环境：本地服务器
  trial:   'https://yundongyl.cn',         // 体验版
  release: 'https://yundongyl.cn',         // 正式版
};
const SERVER_BASE = SERVER_URLS[ENV_VERSION] || SERVER_URLS.release;
const API_BASE_URL = `${SERVER_BASE}/api/miniprogram`;

const call = async (action, data = {}) => {
  console.log(`[API Request] action: ${action}`, data); // Debug log

  let token = wx.getStorageSync('token');
  if (!token) {
    try {
      const loginRes = await wxLogin();
      token = loginRes.token;
    } catch (e) {
      console.error('wxLogin failed', e);
      // Wait, reject should return a rejected promise
      throw new Error('需要微信授权登录');
    }
  }

  return new Promise((resolve, reject) => {
    const header = {
      'Content-Type': 'application/json'
    };

    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    wx.request({
      url: API_BASE_URL,
      method: 'POST',
      header,
      data: {
        action,
        ...data,
      },
      success: (res) => {
        const responseData = res.data;
        console.log(`[API Response] action: ${action}`, responseData); // Debug log

        if (res.statusCode === 401) {
          // Token expired or invalid
          wx.removeStorageSync('token');
          wx.removeStorageSync('user');
          wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/auth/index' });
          }, 1500);
          return reject(new Error('Unauthorized'));
        }

        if (res.statusCode !== 200) {
          const errMsg = responseData.error || responseData.msg || 'Request failed';
          return reject(new Error(errMsg));
        }

        const result = responseData.result;
        if (result && result.code === 0) {
          resolve(result.data);
        } else {
          const msg = result && result.msg ? result.msg : 'Request failed';
          reject(new Error(msg));
        }
      },
      fail: (err) => {
        console.error(`[API Error] ${action}:`, err);
        reject(err);
      }
    });
  });
};

// Handle wx.login to exchange code for token and openid
const wxLogin = () => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          wx.request({
            url: `${API_BASE_URL}/login-wx`,
            method: 'POST',
            data: { code: res.code },
            success: (loginRes) => {
              if (loginRes.statusCode === 200 && loginRes.data.token) {
                wx.setStorageSync('token', loginRes.data.token);
                wx.setStorageSync('openid', loginRes.data.openid);
                resolve(loginRes.data);
              } else {
                reject(new Error(loginRes.data.error || '登录失败'));
              }
            },
            fail: reject
          });
        } else {
          reject(new Error('获取用户登录态失败！' + res.errMsg));
        }
      },
      fail: reject
    });
  });
};

/**
 * 上传图片到后端 /api/upload/image，返回可访问的 HTTP URL
 * @param {string} filePath - 本地临时文件路径
 * @param {function} [onProgress] - 进度回调(0~100)
 * @returns {Promise<string>} 图片的 HTTP URL
 */
const uploadImage = (filePath, onProgress) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    if (!token) {
      return reject(new Error('需要微信授权登录'));
    }

    const serverBase = API_BASE_URL.replace('/api/miniprogram', '');
    const uploadTask = wx.uploadFile({
      url: `${serverBase}/api/upload/image`,
      filePath,
      name: 'file',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data);
            if (data.url) {
              resolve(data.url);
            } else {
              reject(new Error(data.error || '上传失败'));
            }
          } catch {
            reject(new Error('响应解析失败'));
          }
        } else if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          reject(new Error('Unauthorized'));
        } else {
          reject(new Error(`上传失败，状态码: ${res.statusCode}`));
        }
      },
      fail: reject
    });

    if (onProgress && uploadTask) {
      uploadTask.onProgressUpdate((res) => {
        onProgress(res.progress || 0);
      });
    }
  });
};

// 注意：上传图片接口路径相对于服务器根，不含 /api/miniprogram 后缀
// 因此 uploadImage 内部构建 URL 时使用不含 /api/miniprogram 的基础地址
Object.defineProperty(uploadImage, '_baseUrl', {
  get: () => API_BASE_URL.replace('/api/miniprogram', '')
});

module.exports = {
  call,
  wxLogin,
  uploadImage,
  getApiBaseUrl: () => API_BASE_URL.replace('/api/miniprogram', '')
};
