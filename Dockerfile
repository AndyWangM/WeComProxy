# 使用官方Node.js运行时作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 创建数据目录
RUN mkdir -p /app/data/config /app/data/cache /app/data/logs

# 复制package.json
COPY package.json ./

# 安装依赖（在Alpine Linux中，Node.js内置模块不需要额外安装）
RUN npm install --only=production

# 复制源代码
COPY src/ ./src/
COPY web/ ./web/

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S wecom -u 1001

# 设置数据目录权限
RUN chown -R wecom:nodejs /app/data

# 切换到非root用户
USER wecom

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');const options={host:'localhost',port:3000,path:'/api/stats',timeout:2000};const req=http.request(options,res=>{process.exit(res.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.end();"

# 启动应用
CMD ["npm", "start"]