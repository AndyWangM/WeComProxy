class WeComClient {
  constructor(tokenManager) {
    this.tokenManager = tokenManager;
  }

  async sendMessage(appId, messageData) {
    try {
      // 验证输入数据
      this.validateMessageData(messageData);

      // 获取应用配置
      const appConfig = this.tokenManager.configManager.getApp(appId);
      if (!appConfig || !appConfig.enabled) {
        throw new Error(`App ${appId} not found or disabled`);
      }

      // 获取access token
      const accessToken = await this.tokenManager.getAccessToken(appId);

      // 格式化消息
      const formattedMessage = this.formatMessage(messageData, appConfig);

      // 构建企业微信API消息格式
      const wecomMessage = this.buildWecomMessage(formattedMessage, appConfig);

      // 发送消息
      const result = await this.sendToWecom(accessToken, wecomMessage, appConfig.proxy_url);

      return {
        success: true,
        message_id: result.msgid || null,
        invaliduser: result.invaliduser || null,
        invalidparty: result.invalidparty || null,
        invalidtag: result.invalidtag || null
      };
    } catch (error) {
      console.error(`Error sending message for ${appId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  validateMessageData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Message data must be an object');
    }

    if (!data.sender || typeof data.sender !== 'string') {
      throw new Error('sender field is required and must be a string');
    }

    if (!data.time || typeof data.time !== 'string') {
      throw new Error('time field is required and must be a string');
    }

    if (!data.content || typeof data.content !== 'string') {
      throw new Error('content field is required and must be a string');
    }
  }

  formatMessage(messageData, appConfig) {
    const template = appConfig.message_format || '发送人：{sender}\\n时间：{time}\\n内容：{content}';

    return template
      .replace(/{sender}/g, messageData.sender)
      .replace(/{time}/g, messageData.time)
      .replace(/{content}/g, messageData.content);
  }

  buildWecomMessage(content, appConfig) {
    const message = {
      msgtype: 'text',
      agentid: appConfig.agentid,
      text: {
        content: content
      }
    };

    // 设置接收者
    if (appConfig.target_users && appConfig.target_users.trim()) {
      message.touser = appConfig.target_users.trim();
    }

    if (appConfig.target_parties && appConfig.target_parties.trim()) {
      message.toparty = appConfig.target_parties.trim();
    }

    if (appConfig.target_tags && appConfig.target_tags.trim()) {
      message.totag = appConfig.target_tags.trim();
    }

    // 如果没有设置任何接收者，默认发给所有人
    if (!message.touser && !message.toparty && !message.totag) {
      message.touser = '@all';
    }

    return message;
  }

  async sendToWecom(accessToken, message, proxyUrl) {
    const apiUrl = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`;

    try {
      let response;

      if (proxyUrl && proxyUrl.trim() && proxyUrl !== 'skip') {
        // 通过代理发送
        response = await this.sendViaProxy(proxyUrl.trim(), apiUrl, message);
      } else {
        // 直接发送
        response = await this.sendDirect(apiUrl, message);
      }

      const result = await response.json();

      if (result.errcode !== 0) {
        throw new Error(`WeChat API error: ${result.errmsg} (code: ${result.errcode})`);
      }

      return result;
    } catch (error) {
      console.error('Error sending to WeChat:', error);
      throw error;
    }
  }

  async sendDirect(apiUrl, message) {
    // 获取全局代理配置
    const serverConfig = this.tokenManager.configManager.loadServerConfig();
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    };

    // 如果配置了全局代理，使用代理
    if (serverConfig.global_proxy) {
      const { ProxyAgent } = await import('undici');
      const proxyOptions = {
        uri: serverConfig.global_proxy
      };

      // 在开发环境中忽略SSL错误
      if (serverConfig.ignore_ssl_errors) {
        proxyOptions.requestTls = {
          rejectUnauthorized: false
        };
        console.log(`Using global proxy with SSL bypass for direct send: ${serverConfig.global_proxy}`);
      } else {
        console.log(`Using global proxy for direct send: ${serverConfig.global_proxy}`);
      }

      fetchOptions.dispatcher = new ProxyAgent(proxyOptions);
    }

    return fetch(apiUrl, fetchOptions);
  }

  async sendViaProxy(proxyUrl, apiUrl, message) {
    // 通过代理服务器转发请求
    const proxyPayload = {
      method: 'POST',
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      body: message
    };

    return fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(proxyPayload)
    });
  }

  // 测试消息发送
  async testMessage(appId) {
    const testData = {
      sender: '系统测试',
      time: new Date().toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      content: '这是一条测试消息，用于验证企业微信代理服务是否正常工作。'
    };

    return await this.sendMessage(appId, testData);
  }
}

export default WeComClient;