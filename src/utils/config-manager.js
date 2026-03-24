import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ConfigManager {
  constructor() {
    this.dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
    this.configDir = path.join(this.dataDir, 'config');
    this.backupDir = path.join(this.configDir, 'backups');
    this.appsConfigPath = path.join(this.configDir, 'apps.json');
    this.serverConfigPath = path.join(this.configDir, 'server.json');

    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.dataDir, this.configDir, this.backupDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  loadAppsConfig() {
    try {
      if (!fs.existsSync(this.appsConfigPath)) {
        return {};
      }
      const content = fs.readFileSync(this.appsConfigPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error loading apps config:', error);
      return {};
    }
  }

  loadServerConfig() {
    try {
      // 优先使用开发环境配置
      const devConfigPath = path.join(this.configDir, 'server.dev.json');
      // 检测开发环境：NODE_ENV=development 或者存在dev配置文件且不是生产环境
      const isDevMode = process.env.NODE_ENV === 'development' ||
                       (fs.existsSync(devConfigPath) && process.env.NODE_ENV !== 'production');

      let configPath = this.serverConfigPath;
      if (isDevMode && fs.existsSync(devConfigPath)) {
        configPath = devConfigPath;
        console.log('🔧 Using development config with proxy:', configPath);
      }

      if (!fs.existsSync(configPath)) {
        return {
          port: 3000,
          host: '0.0.0.0',
          base_path: '',
          log_level: 'info'
        };
      }
      const content = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error loading server config:', error);
      return {
        port: 3000,
        host: '0.0.0.0',
        base_path: '',
        log_level: 'info'
      };
    }
  }

  saveAppsConfig(config) {
    try {
      // 创建备份
      this.createBackup();

      // 保存新配置
      const content = JSON.stringify(config, null, 2);
      fs.writeFileSync(this.appsConfigPath, content, 'utf8');

      console.log('Apps config saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving apps config:', error);
      return false;
    }
  }

  createBackup() {
    try {
      if (!fs.existsSync(this.appsConfigPath)) {
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `apps.${timestamp}.json`);

      fs.copyFileSync(this.appsConfigPath, backupPath);
      console.log(`Backup created: ${backupPath}`);

      // 清理旧备份
      this.cleanOldBackups();
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }

  cleanOldBackups() {
    try {
      const serverConfig = this.loadServerConfig();
      const retentionDays = serverConfig.backup_retention_days || 30;
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

      const files = fs.readdirSync(this.backupDir);

      files.forEach(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          console.log(`Deleted old backup: ${file}`);
        }
      });
    } catch (error) {
      console.error('Error cleaning old backups:', error);
    }
  }

  getApp(appId) {
    const apps = this.loadAppsConfig();
    return apps[appId] || null;
  }

  getAllApps() {
    return this.loadAppsConfig();
  }

  addApp(appId, config) {
    const apps = this.loadAppsConfig();
    apps[appId] = config;
    return this.saveAppsConfig(apps);
  }

  updateApp(appId, config) {
    const apps = this.loadAppsConfig();
    if (!apps[appId]) {
      return false;
    }
    apps[appId] = { ...apps[appId], ...config };
    return this.saveAppsConfig(apps);
  }

  deleteApp(appId) {
    const apps = this.loadAppsConfig();
    if (!apps[appId]) {
      return false;
    }
    delete apps[appId];
    return this.saveAppsConfig(apps);
  }

  getBackupList() {
    try {
      const files = fs.readdirSync(this.backupDir);
      return files
        .filter(file => file.startsWith('apps.') && file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            created: stats.mtime,
            size: stats.size
          };
        })
        .sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error('Error getting backup list:', error);
      return [];
    }
  }
}

export default ConfigManager;