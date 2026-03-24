// WeComProxy 管理界面脚本

class WeComProxyAdmin {
    constructor() {
        this.currentEditingApp = null;
        this.token = this.getStoredToken();

        // 检查认证
        if (!this.token) {
            this.showLoginPrompt();
            return;
        }

        this.init();
    }

    showLoginPrompt() {
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif;">
                <div style="text-align: center; padding: 40px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2>🔐 需要登录</h2>
                    <p>请先登录获取访问权限</p>
                    <button onclick="window.location.reload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">刷新页面</button>
                </div>
            </div>
        `;
    }

    getStoredToken() {
        return sessionStorage.getItem('wecom_token') || localStorage.getItem('wecom_token');
    }

    setStoredToken(token) {
        sessionStorage.setItem('wecom_token', token);
        localStorage.setItem('wecom_token', token);
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    async init() {
        // 初始化时间
        this.updateTestTime();

        // 加载统计信息
        await this.loadStats();

        // 加载应用列表
        await this.loadApps();

        // 绑定事件
        this.bindEvents();
    }

    bindEvents() {
        // 测试表单提交
        document.getElementById('test-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendTestMessage();
        });

        // 应用表单提交
        document.getElementById('app-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveApp();
        });

        // 模态框点击外部关闭
        document.getElementById('app-modal').addEventListener('click', (e) => {
            if (e.target.id === 'app-modal') {
                this.closeModal();
            }
        });
    }

    // 显示标签页
    showTab(tabName) {
        // 隐藏所有标签页
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // 显示指定标签页
        document.getElementById(`${tabName}-tab`).classList.add('active');
        event.target.classList.add('active');

        // 如果是测试标签页，更新应用选择列表
        if (tabName === 'test') {
            this.updateTestAppSelect();
        }

        // 如果是Token管理标签页，加载Token信息
        if (tabName === 'auth') {
            this.loadTokenInfo();
        }
    }

    // 加载统计信息
    async loadStats() {
        try {
            const response = await fetch('/api/stats', {
                headers: this.getAuthHeaders()
            });
            const result = await response.json();

            if (result.success) {
                document.getElementById('total-apps').textContent = result.data.total_apps;
                document.getElementById('enabled-apps').textContent = result.data.enabled_apps;
                document.getElementById('valid-tokens').textContent = result.data.apps_with_valid_tokens;
            }
        } catch (error) {
            console.error('加载统计信息失败:', error);
        }
    }

    // 加载应用列表
    async loadApps() {
        try {
            const response = await fetch('/api/apps', {
                headers: this.getAuthHeaders()
            });
            const result = await response.json();

            if (result.success) {
                this.renderApps(result.data);
            } else {
                this.showMessage('加载应用列表失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('加载应用列表失败:', error);
            this.showMessage('网络错误，无法加载应用列表', 'error');
        }
    }

    // 渲染应用列表
    renderApps(apps) {
        const container = document.getElementById('apps-list');

        if (apps.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <h3>暂无应用配置</h3>
                    <p>点击"添加应用"按钮创建第一个应用配置</p>
                </div>
            `;
            return;
        }

        container.innerHTML = apps.map(app => `
            <div class="app-card">
                <div class="app-header">
                    <div class="app-title">${this.escapeHtml(app.name)}</div>
                    <div class="app-status ${app.enabled ? 'status-enabled' : 'status-disabled'}">
                        ${app.enabled ? '✅ 已启用' : '❌ 已禁用'}
                    </div>
                </div>
                <div class="app-info">
                    <div class="info-item">
                        <div class="info-label">应用ID</div>
                        <div class="info-value">${this.escapeHtml(app.id)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">企业ID</div>
                        <div class="info-value">${this.escapeHtml(app.corpid)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">代理应用ID</div>
                        <div class="info-value">${app.agentid}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">接收人</div>
                        <div class="info-value">${this.escapeHtml(app.target_users || '@all')}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Webhook地址</div>
                        <div class="info-value">
                            <code>/webhook/${this.escapeHtml(app.id)}</code>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Token状态</div>
                        <div class="info-value">
                            ${app.token_status.has_token ?
                                (app.token_status.expired ? '🟡 已过期' : '🟢 有效') :
                                '🔴 无Token'
                            }
                        </div>
                    </div>
                </div>
                <div class="app-actions">
                    <button class="btn btn-success" onclick="admin.testApp('${app.id}')">🧪 测试</button>
                    <button class="btn btn-secondary" onclick="admin.editApp('${app.id}')">✏️ 编辑</button>
                    <button class="btn btn-danger" onclick="admin.deleteApp('${app.id}', '${this.escapeHtml(app.name)}')">🗑️ 删除</button>
                </div>
            </div>
        `).join('');
    }

    // 显示添加应用模态框
    showAddAppModal() {
        this.currentEditingApp = null;
        document.getElementById('modal-title').textContent = '添加应用';
        document.getElementById('app-form').reset();
        document.getElementById('app-id').disabled = false;
        document.getElementById('app-modal').style.display = 'block';
    }

    // 编辑应用
    async editApp(appId) {
        try {
            const response = await fetch(`/api/apps/${appId}`, {
                headers: this.getAuthHeaders()
            });
            const result = await response.json();

            if (result.success) {
                const app = result.data;
                this.currentEditingApp = appId;

                document.getElementById('modal-title').textContent = '编辑应用';
                document.getElementById('app-id').value = app.id;
                document.getElementById('app-id').disabled = true;
                document.getElementById('app-name').value = app.name;
                document.getElementById('app-corpid').value = app.corpid;
                document.getElementById('app-corpsecret').value = app.corpsecret;
                document.getElementById('app-agentid').value = app.agentid;
                document.getElementById('app-proxy-url').value = app.proxy_url || '';
                document.getElementById('app-target-users').value = app.target_users || '';
                document.getElementById('app-target-parties').value = app.target_parties || '';
                document.getElementById('app-message-format').value = app.message_format;
                document.getElementById('app-enabled').checked = app.enabled;

                document.getElementById('app-modal').style.display = 'block';
            } else {
                this.showMessage('获取应用信息失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('编辑应用失败:', error);
            this.showMessage('网络错误，无法获取应用信息', 'error');
        }
    }

    // 保存应用
    async saveApp() {
        const formData = {
            name: document.getElementById('app-name').value,
            corpid: document.getElementById('app-corpid').value,
            corpsecret: document.getElementById('app-corpsecret').value,
            agentid: parseInt(document.getElementById('app-agentid').value),
            proxy_url: document.getElementById('app-proxy-url').value,
            target_users: document.getElementById('app-target-users').value,
            target_parties: document.getElementById('app-target-parties').value,
            message_format: document.getElementById('app-message-format').value,
            enabled: document.getElementById('app-enabled').checked
        };

        try {
            let response;
            if (this.currentEditingApp) {
                // 编辑现有应用
                response = await fetch(`/api/apps/${this.currentEditingApp}`, {
                    method: 'PUT',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(formData)
                });
            } else {
                // 创建新应用
                formData.id = document.getElementById('app-id').value;
                response = await fetch('/api/apps', {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(formData)
                });
            }

            const result = await response.json();

            if (result.success) {
                this.showMessage(this.currentEditingApp ? '应用更新成功' : '应用创建成功', 'success');
                this.closeModal();
                await this.loadApps();
                await this.loadStats();
            } else {
                this.showMessage('保存失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('保存应用失败:', error);
            this.showMessage('网络错误，保存失败', 'error');
        }
    }

    // 删除应用
    async deleteApp(appId, appName) {
        if (!confirm(`确定要删除应用 "${appName}" 吗？此操作不可恢复。`)) {
            return;
        }

        try {
            const response = await fetch(`/api/apps/${appId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage('应用删除成功', 'success');
                await this.loadApps();
                await this.loadStats();
            } else {
                this.showMessage('删除失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('删除应用失败:', error);
            this.showMessage('网络错误，删除失败', 'error');
        }
    }

    // 测试应用
    async testApp(appId) {
        try {
            const response = await fetch(`/api/test/${appId}`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage('测试消息发送成功', 'success');
            } else {
                this.showMessage('测试失败: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('测试应用失败:', error);
            this.showMessage('网络错误，测试失败', 'error');
        }
    }

    // 刷新应用列表
    async refreshApps() {
        await this.loadApps();
        await this.loadStats();
        this.showMessage('应用列表已刷新', 'success');
    }

    // 更新测试时间
    updateTestTime() {
        const now = new Date();
        const timeString = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('test-time').value = timeString;
    }

    // 更新测试应用选择
    async updateTestAppSelect() {
        try {
            const response = await fetch('/api/apps', {
                headers: this.getAuthHeaders()
            });
            const result = await response.json();

            if (result.success) {
                const select = document.getElementById('test-app-select');
                select.innerHTML = '<option value="">请选择应用</option>' +
                    result.data
                        .filter(app => app.enabled)
                        .map(app => `<option value="${app.id}">${this.escapeHtml(app.name)}</option>`)
                        .join('');
            }
        } catch (error) {
            console.error('更新测试应用选择失败:', error);
        }
    }

    // 发送测试消息
    async sendTestMessage() {
        const appId = document.getElementById('test-app-select').value;
        if (!appId) {
            this.showMessage('请选择要测试的应用', 'error');
            return;
        }

        const messageData = {
            sender: document.getElementById('test-sender').value,
            time: document.getElementById('test-time').value,
            content: document.getElementById('test-content').value
        };

        try {
            const response = await fetch(`/webhook/${appId}`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(messageData)
            });

            const result = await response.json();

            const resultArea = document.getElementById('test-result');
            if (result.success) {
                resultArea.className = 'result-area result-success';
                resultArea.textContent = '✅ 测试消息发送成功\n\n' + JSON.stringify(result, null, 2);
            } else {
                resultArea.className = 'result-area result-error';
                resultArea.textContent = '❌ 测试消息发送失败\n\n' + (result.message || result.error);
            }
        } catch (error) {
            console.error('发送测试消息失败:', error);
            const resultArea = document.getElementById('test-result');
            resultArea.className = 'result-area result-error';
            resultArea.textContent = '❌ 网络错误，发送失败\n\n' + error.message;
        }
    }

    // 关闭模态框
    closeModal() {
        document.getElementById('app-modal').style.display = 'none';
        this.currentEditingApp = null;
    }

    // 显示消息
    showMessage(message, type) {
        // 简单的消息显示，可以后续优化为toast通知
        const className = type === 'success' ? 'result-success' : 'result-error';
        const emoji = type === 'success' ? '✅' : '❌';

        // 临时显示在页面顶部
        const messageDiv = document.createElement('div');
        messageDiv.className = `result-area ${className}`;
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translateX(-50%)';
        messageDiv.style.zIndex = '9999';
        messageDiv.style.minWidth = '300px';
        messageDiv.style.textAlign = 'center';
        messageDiv.textContent = `${emoji} ${message}`;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 3000);
    }

    // Token管理方法
    async loadTokenInfo() {
        try {
            const response = await fetch('/api/auth/info', {
                headers: this.getAuthHeaders()
            });

            const result = await response.json();

            if (result.success) {
                document.getElementById('current-token').textContent = result.data.token;
                document.getElementById('token-created').textContent = new Date(result.data.created_at).toLocaleString('zh-CN');
                document.getElementById('token-updated').textContent = new Date(result.data.updated_at).toLocaleString('zh-CN');
            } else {
                this.showMessage('获取Token信息失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('获取Token信息失败:', error);
            this.showMessage('网络错误，无法获取Token信息', 'error');
        }
    }

    async regenerateToken() {
        if (!confirm('确定要重新生成API Token吗？\n\n⚠️ 重新生成后，所有使用旧Token的API调用将失效，需要更新为新Token。')) {
            return;
        }

        try {
            const response = await fetch('/api/auth/regenerate', {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            const result = await response.json();

            if (result.success) {
                // 更新存储的Token
                this.token = result.data.token;
                this.setStoredToken(this.token);

                // 显示新Token
                const newTokenHtml = `
                    <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 10px 0;">
                        <h4 style="color: #155724; margin-bottom: 10px;">✅ Token重新生成成功</h4>
                        <p style="color: #155724; margin-bottom: 10px;"><strong>新Token:</strong></p>
                        <code style="background: #2d3748; color: #e2e8f0; padding: 10px; border-radius: 6px; display: block; word-break: break-all; font-size: 14px;">${result.data.token}</code>
                        <p style="color: #721c24; margin-top: 10px; font-size: 0.9em;">⚠️ 请立即复制并保存此Token，页面刷新后将不再显示完整Token</p>
                    </div>
                `;

                // 临时显示完整Token
                const tokenInfoDiv = document.getElementById('token-info');
                tokenInfoDiv.innerHTML = newTokenHtml + tokenInfoDiv.innerHTML;

                // 重新加载Token信息
                setTimeout(() => {
                    this.loadTokenInfo();
                }, 10000); // 10秒后隐藏完整Token

                this.showMessage('Token重新生成成功，请及时更新API客户端', 'success');
            } else {
                this.showMessage('Token重新生成失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('重新生成Token失败:', error);
            this.showMessage('网络错误，Token重新生成失败', 'error');
        }
    }

    logout() {
        if (confirm('确定要退出登录吗？')) {
            // 清除存储的Token
            sessionStorage.removeItem('wecom_token');
            localStorage.removeItem('wecom_token');

            // 重新加载页面，会跳转到登录界面
            window.location.reload();
        }
    }

    // HTML转义
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }
}

// 全局函数，供HTML调用
function showTab(tabName) {
    admin.showTab(tabName);
}

function showAddAppModal() {
    admin.showAddAppModal();
}

function refreshApps() {
    admin.refreshApps();
}

function closeModal() {
    admin.closeModal();
}

// 初始化管理界面
let admin;
document.addEventListener('DOMContentLoaded', () => {
    admin = new WeComProxyAdmin();
});