# 使用官方 Node 镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 切换 Alpine 软件源，避免默认源下载过慢导致构建卡住
RUN sed -i 's|https://dl-cdn.alpinelinux.org/alpine/|https://mirrors.aliyun.com/alpine/|g' /etc/apk/repositories

# 安装 bcrypt 原生模块编译所需的构建工具
RUN apk add --no-cache python3 make g++

# 复制 package.json 和 lock 文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 编译完成后移除构建工具，减小镜像体积
RUN apk del python3 make g++

# 复制所有源代码
COPY . .

# 构建前端静态文件 (Vite build)
RUN npm run build

# 暴露 3000 端口
EXPOSE 3000

# 启动 Express 服务器
CMD ["npm", "start"]
