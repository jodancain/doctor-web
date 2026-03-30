const { ensureAuth, getCurrentUser } = require('../../../utils/auth');
const { fetchConversation, sendMessage } = require('../services/chat');
const { uploadImage } = require('../../../utils/request');

Page({
  data: {
    targetOpenid: '',
    targetName: '',
    targetRole: '',
    storageKey: '',
    messages: [],
    toView: '',
    content: '',
    doctor: null,
    patient: null,
    currentUser: null,
    loading: false,
    showMore: false,
    paddingBottom: 0, // To adjust for input bar height or more panel
    syncing: false,
  },

  onLoad(options = {}) {
    const targetOpenid = options.targetOpenid || '';
    const targetName = decodeURIComponent(options.name || '');
    const targetRole = options.role || '';
    const storageKey = targetOpenid ? `chat_cache_${targetOpenid}` : '';
    this.setData({ targetOpenid, targetName, targetRole, storageKey });
  },

  onShow() {
    if (!ensureAuth()) {
      return;
    }
    
    const currentUser = getCurrentUser();
    // Normalize openid to ensure consistency (handle _openid vs openid)
    if (currentUser && !currentUser.openid && currentUser._openid) {
      currentUser.openid = currentUser._openid;
    }
    this.setData({ currentUser });

    if (!this.data.targetOpenid) {
      wx.navigateBack();
      return;
    }

    this.loadCachedMessages();
    this.loadConversation();
    this.startPolling();
  },

  onHide() {
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  startPolling() {
    this.stopPolling();
    this._pollingTimer = setInterval(() => {
      this.refreshMessages();
    }, 5000);
  },

  stopPolling() {
    if (this._pollingTimer) {
      clearInterval(this._pollingTimer);
      this._pollingTimer = null;
    }
  },

  async loadConversation() {
    this.setData({ loading: true });
    await this.refreshMessages(true);
    this.setData({ loading: false });
  },

  async refreshMessages(scrollToBottom = false) {
    if (!this.data.targetOpenid || this.data.syncing) return;

    this.setData({ syncing: true });

    try {
      const result = await fetchConversation(this.data.targetOpenid);
      let newMessages = (result && result.messages) ? result.messages : [];

      newMessages = newMessages
        .filter(m => m.msgType === 'image' || (m.content && m.content.trim().length > 0))
        .map(m => ({ ...m, status: m.status || 'success' }));

      const mergedMessages = await this.enrichMessages(this.mergeMessages(newMessages));

      const lastOldMsg = this.data.messages[this.data.messages.length - 1];
      const lastNewMsg = mergedMessages[mergedMessages.length - 1];

      const hasChange = mergedMessages.length !== this.data.messages.length ||
                        (lastNewMsg && (!lastOldMsg || lastNewMsg._id !== lastOldMsg._id));

      if (hasChange || scrollToBottom) {
        this.setData({
          messages: mergedMessages,
          doctor: result ? result.doctor : null,
          patient: result ? result.patient : null,
        });
        this.persistMessages(mergedMessages);

        if (result) {
           const targetUser = (this.data.currentUser && this.data.currentUser.role === 'doctor') ? result.patient : result.doctor;
           if (targetUser) {
             this.setData({
               targetName: targetUser.nickName || targetUser.username || '用户'
             });
             wx.setNavigationBarTitle({
               title: this.data.targetName
             });
           }
        }

        if (scrollToBottom || mergedMessages.length > this.data.messages.length) {
          this.scrollToBottom();
        }
      }
    } catch (error) {
      console.error('Fetch conversation failed', error);
    } finally {
      this.setData({ syncing: false });
    }
  },

  onInput(e) {
    this.setData({ content: e.detail.value });
  },

  toggleMore() {
    this.setData({
      showMore: !this.data.showMore
    }, () => {
        this.scrollToBottom();
    });
  },

  async handleSend() {
    const content = (this.data.content || '').trim();
    if (!content) {
      wx.showToast({ title: '内容不能为空', icon: 'none' });
      return;
    }

    await this.sendTextMessage(content);
  },

  chooseImage() {
    wx.showActionSheet({
      itemList: ['从相册选择', '拍照'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 从相册选择
          this.chooseImageFromAlbum();
        } else if (res.tapIndex === 1) {
          // 拍照
          this.takePhoto();
        }
      },
      fail: () => {
        // 用户取消
      }
    });
  },

  chooseImageFromAlbum() {
    // 优先使用 chooseMedia（支持多选），降级到 chooseImage
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 9, // 最多选择9张图片
        mediaType: ['image'],
        sourceType: ['album'],
        sizeType: ['compressed'], // 自动压缩
        success: (res) => {
          const files = res.tempFiles || res.tempFilePaths.map(path => ({ tempFilePath: path }));
          this.handleSelectedImages(files);
        },
        fail: (err) => {
          console.error('选择图片失败', err);
          // 降级到 chooseImage
          this.chooseImageFromAlbumFallback();
        }
      });
    } else {
      this.chooseImageFromAlbumFallback();
    }
  },

  chooseImageFromAlbumFallback() {
    // 降级方案：使用 chooseImage（仅支持单选）
    wx.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        const files = res.tempFilePaths.map(path => ({ tempFilePath: path }));
        this.handleSelectedImages(files);
      },
      fail: (err) => {
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          wx.showToast({ title: '选择图片失败', icon: 'none' });
        }
      }
    });
  },

  takePhoto() {
    // 优先使用 chooseMedia，降级到 chooseImage
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['camera'],
        sizeType: ['compressed'],
        success: (res) => {
          const files = res.tempFiles || res.tempFilePaths.map(path => ({ tempFilePath: path }));
          this.handleSelectedImages(files);
        },
        fail: (err) => {
          console.error('拍照失败', err);
          // 降级到 chooseImage
          this.takePhotoFallback();
        }
      });
    } else {
      this.takePhotoFallback();
    }
  },

  takePhotoFallback() {
    // 降级方案：使用 chooseImage
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: (res) => {
        const files = res.tempFilePaths.map(path => ({ tempFilePath: path }));
        this.handleSelectedImages(files);
      },
      fail: (err) => {
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          wx.showToast({ title: '拍照失败', icon: 'none' });
        }
      }
    });
  },

  async handleSelectedImages(files) {
    // 关闭更多面板
    this.setData({ showMore: false });

    if (!files || files.length === 0) {
      return;
    }

    // 检查图片大小（限制为10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = file.tempFilePath || file.path || file;
      
      try {
        const fileInfo = await this.getFileInfo(filePath);
        
        if (fileInfo.size > maxSize) {
          wx.showToast({ 
            title: `第${i + 1}张图片超过10MB，已跳过`, 
            icon: 'none',
            duration: 2000
          });
          continue;
        }
        
        validFiles.push({
          path: filePath,
          size: fileInfo.size
        });
      } catch (err) {
        console.error('获取文件信息失败', err);
        // 即使获取文件信息失败，也尝试上传
        validFiles.push({
          path: filePath,
          size: 0
        });
      }
    }

    if (validFiles.length === 0) {
      wx.showToast({ title: '没有可上传的图片', icon: 'none' });
      return;
    }

    // 依次上传图片（避免同时上传太多）
    for (let i = 0; i < validFiles.length; i++) {
      await this.uploadAndSendImage(validFiles[i].path);
      // 稍微延迟，避免同时上传太多图片
      if (i < validFiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  },

  getFileInfo(filePath) {
    return new Promise((resolve, reject) => {
      wx.getFileInfo({
        filePath,
        success: (res) => {
          resolve({ size: res.size, path: filePath });
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  async uploadAndSendImage(filePath, clientMsgId) {
    const sender = this.getSenderOpenid();
    const messageId = clientMsgId || this.createClientMsgId();

    if (!clientMsgId) {
      // 优化：先压缩图片再显示
      let optimizedPath = filePath;
      try {
        // 尝试压缩大图（仅当文件较大时）
        const fileInfo = await this.getFileInfo(filePath);
        if (fileInfo.size > 2 * 1024 * 1024) { // 大于2MB才压缩
          optimizedPath = await this.compressImage(filePath);
        }
      } catch (err) {
        console.warn('图片压缩失败，使用原图', err);
      }

      const optimisticMessage = {
        _id: messageId,
        clientMsgId: messageId,
        fromOpenid: sender,
        toOpenid: this.data.targetOpenid,
        content: optimizedPath,
        tempUrl: optimizedPath,
        msgType: 'image',
        createdAt: Date.now(),
        status: 'uploading',
        uploadProgress: 0,
        localPath: filePath,
      };

      this.setData({
        messages: [...this.data.messages, optimisticMessage],
      });
      this.scrollToBottom();
    } else {
      this.updateMessageStatus(messageId, 'uploading', { 
        localPath: filePath,
        uploadProgress: 0 
      });
    }

    try {
      // 更新状态为上传中
      this.updateMessageStatus(messageId, 'uploading', { uploadProgress: 10 });

      // 上传文件到自建服务器（支持进度回调）
      this.updateMessageStatus(messageId, 'uploading', { uploadProgress: 30 });

      const imageUrl = await uploadImage(filePath, (progress) => {
        this.updateMessageStatus(messageId, 'uploading', { uploadProgress: 30 + Math.floor(progress * 0.4) });
      });

      this.updateMessageStatus(messageId, 'uploading', { uploadProgress: 70 });

      const message = await sendMessage({
        targetOpenid: this.data.targetOpenid,
        content: imageUrl,
        msgType: 'image',
        clientMsgId: messageId,
      });

      this.updateMessageStatus(messageId, 'uploading', { uploadProgress: 100 });

      this.replaceMessage(messageId, {
        ...message,
        clientMsgId: messageId,
        tempUrl: imageUrl,
        status: 'success',
        uploadProgress: 100,
      });
      this.scrollToBottom();
    } catch (err) {
      console.error('Send image failed', err);
      this.updateMessageStatus(messageId, 'fail', { uploadProgress: 0 });
      
      let errorMsg = '发送图片失败';
      if (err.errMsg) {
        if (err.errMsg.includes('exceed')) {
          errorMsg = '图片过大，请选择较小的图片';
        } else if (err.errMsg.includes('network')) {
          errorMsg = '网络错误，请检查网络连接';
        }
      }
      wx.showToast({ title: errorMsg, icon: 'none', duration: 2000 });
    }
  },

  compressImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.compressImage({
        src: filePath,
        quality: 80, // 压缩质量
        success: (res) => {
          resolve(res.tempFilePath);
        },
        fail: (err) => {
          // 压缩失败返回原图
          resolve(filePath);
        }
      });
    });
  },

  previewImage(e) {
    const { src, msgid } = e.currentTarget.dataset;
    
    // 收集所有图片消息的URL，用于左右滑动预览
    const imageMessages = this.data.messages.filter(m => m.msgType === 'image');
    const imageUrls = imageMessages.map(m => m.tempUrl || m.content).filter(url => url);
    const currentIndex = imageUrls.findIndex(url => url === src || url.includes(src) || src.includes(url));
    
    wx.previewImage({
      current: src || imageUrls[0] || '',
      urls: imageUrls.length > 0 ? imageUrls : [src],
      showmenu: true, // 显示长按保存菜单
      enableShowPhotoDownload: true // 允许下载
    });
  },

  longPressImage(e) {
    const { src } = e.currentTarget.dataset;
    wx.showActionSheet({
      itemList: ['保存图片', '查看原图'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.saveImage(src);
        } else if (res.tapIndex === 1) {
          this.previewImage(e);
        }
      }
    });
  },

  saveImage(src) {
    // 图片现在统一使用 HTTP URL，直接下载保存
    this.downloadAndSaveImage(src);
  },

  downloadAndSaveImage(url) {
    wx.showLoading({ title: '保存中...' });
    wx.downloadFile({
      url: url,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({ title: '保存成功', icon: 'success' });
            },
            fail: (err) => {
              wx.hideLoading();
              if (err.errMsg.includes('auth deny')) {
                wx.showModal({
                  title: '提示',
                  content: '需要授权保存图片到相册',
                  showCancel: false
                });
              } else {
                wx.showToast({ title: '保存失败', icon: 'none' });
              }
            }
          });
        } else {
          wx.hideLoading();
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
    });
  },

  scrollToBottom() {
    this.setData({ toView: '' }, () => {
      this.setData({
        toView: 'scroll-bottom'
      });
    });
  },

  async sendTextMessage(content, clientMsgId) {
    const sender = this.getSenderOpenid();
    const messageId = clientMsgId || this.createClientMsgId();

    if (!clientMsgId) {
      const optimisticMessage = {
        _id: messageId,
        clientMsgId: messageId,
        fromOpenid: sender,
        toOpenid: this.data.targetOpenid,
        content,
        msgType: 'text',
        createdAt: Date.now(),
        status: 'pending',
      };

      this.setData({
        messages: [...this.data.messages, optimisticMessage],
        content: '',
        showMore: false
      });
      this.scrollToBottom();
    } else {
      this.updateMessageStatus(messageId, 'pending');
    }

    try {
      const message = await sendMessage({ targetOpenid: this.data.targetOpenid, content, msgType: 'text', clientMsgId: messageId });
      this.replaceMessage(messageId, { ...message, clientMsgId: messageId, status: 'success' });
      this.scrollToBottom();
    } catch (error) {
      this.updateMessageStatus(messageId, 'fail');
      wx.showToast({ title: error.message || '发送失败', icon: 'none' });
    }
  },

  updateMessageStatus(clientMsgId, status, extra = {}) {
    const updated = this.data.messages.map(msg => {
      if ((msg.clientMsgId && msg.clientMsgId === clientMsgId) || (!msg.clientMsgId && msg._id === clientMsgId)) {
        return { ...msg, status, ...extra };
      }
      return msg;
    });

    this.setData({ messages: updated });
  },

  replaceMessage(clientMsgId, newMessage) {
    let found = false;
    const merged = this.data.messages.map(msg => {
      if ((msg.clientMsgId && msg.clientMsgId === clientMsgId) || (!msg.clientMsgId && msg._id === clientMsgId)) {
        found = true;
        return { ...msg, ...newMessage, status: newMessage.status || 'success' };
      }
      return msg;
    });

    const result = found ? merged : [...merged, newMessage];
    this.setData({ messages: result });
  },

  loadCachedMessages() {
    if (!this.data.storageKey) return Promise.resolve();

    return new Promise((resolve) => {
      wx.getStorage({
        key: this.data.storageKey,
        success: ({ data }) => {
          const cachedMessages = Array.isArray(data) ? data : [];
          if (cachedMessages.length > 0) {
            this.setData({ messages: cachedMessages });
            this.scrollToBottom();
          }
          resolve();
        },
        fail: () => resolve(),
      });
    });
  },

  persistMessages(messages = []) {
    if (!this.data.storageKey || messages.length === 0) return;

    wx.setStorage({
      key: this.data.storageKey,
      data: messages.slice(-100),
    });
  },

  mergeMessages(fetchedMessages = []) {
    const localMessages = this.data.messages || [];
    const mergedMap = new Map();

    fetchedMessages.forEach(msg => {
      const key = msg.clientMsgId || msg._id;
      mergedMap.set(key, { ...msg, status: msg.status || 'success' });
    });

    localMessages.forEach(msg => {
      const key = msg.clientMsgId || msg._id;
      if (!mergedMap.has(key) || (msg.status && msg.status !== 'success')) {
        mergedMap.set(key, { ...(mergedMap.get(key) || {}), ...msg });
      }
    });

    return Array.from(mergedMap.values()).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  },

  async enrichMessages(messages = []) {
    // 图片现在统一使用 HTTP URL 存储，直接使用 content 作为展示 URL
    return messages.map(m => {
      if (m.msgType === 'image') {
        const displayUrl = m.tempUrl || m.content || '';
        return { ...m, tempUrl: displayUrl, thumbnailUrl: displayUrl };
      }
      return m;
    });
  },

  createClientMsgId() {
    return `m-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  },

  getSenderOpenid() {
    const user = this.data.currentUser || {};
    return user.openid || user._openid || '';
  },

  handleRetry(e) {
    const clientMsgId = e.currentTarget.dataset.id;
    const target = this.data.messages.find(m => (m.clientMsgId || m._id) === clientMsgId);

    if (!target || target.status !== 'fail') return;

    if (target.msgType === 'image' && target.localPath) {
      this.uploadAndSendImage(target.localPath, clientMsgId);
    }

    if (target.msgType === 'text') {
      this.sendTextMessage(target.content, clientMsgId);
    }
  }
});
