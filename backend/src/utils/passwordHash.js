/**
 * 密码哈希管理工具
 * 用于环境变量的密码哈希功能
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class PasswordHashService {
  constructor() {
    this.saltFile = path.join(__dirname, '../../.hash_salt');
    this.hashConfigFile = path.join(__dirname, '../../.hash_config');
    this.salt = this.loadOrGenerateSalt();
  }

  /**
   * 加载或生成盐值
   */
  loadOrGenerateSalt() {
    try {
      if (fs.existsSync(this.saltFile)) {
        return fs.readFileSync(this.saltFile, 'utf8').trim();
      }
    } catch (e) {
      // 忽略错误，生成新盐
    }

    // 生成新盐
    const salt = crypto.randomBytes(32).toString('hex');
    
    try {
      fs.writeFileSync(this.saltFile, salt, { mode: 0o600 });
    } catch (e) {
      // 无法写入文件，使用环境变量或默认值
      return process.env.HASH_SALT || salt;
    }

    return salt;
  }

  /**
   * 哈希密码
   * @param {string} password - 原始密码
   * @param {object} options - 选项
   * @returns {object} - 包含哈希值和盐的信息
   */
  hash(password, options = {}) {
    if (!password) return null;

    const {
      iterations = 100000,
      keylen = 64,
      digest = 'sha512'
    } = options;

    // 使用 PBKDF2 进行密钥派生
    const hash = crypto.pbkdf2Sync(
      password,
      this.salt,
      iterations,
      keylen,
      digest
    );

    return {
      hash: hash.toString('hex'),
      iterations,
      keylen,
      digest,
      salt: this.salt.substring(0, 16) + '...' // 只显示部分盐
    };
  }

  /**
   * 验证密码
   * @param {string} password - 原始密码
   * @param {string} hashValue - 待验证的哈希值
   * @param {object} options - 选项
   * @returns {boolean} - 验证结果
   */
  verify(password, hashValue, options = {}) {
    if (!password || !hashValue) return false;

    try {
      const {
        iterations = 100000,
        keylen = 64,
        digest = 'sha512'
      } = options;

      const hash = crypto.pbkdf2Sync(
        password,
        this.salt,
        iterations,
        keylen,
        digest
      );

      return hash.toString('hex') === hashValue;
    } catch (e) {
      return false;
    }
  }

  /**
   * 哈希环境变量中的密码
   * @param {object} env - 环境变量对象
   * @param {Array} sensitiveKeys - 需要哈希的键名列表
   * @returns {object} - 哈希后的环境变量
   */
  hashEnvPasswords(env, sensitiveKeys = []) {
    const hashed = { ...env };

    // 默认敏感键名
    const defaultSensitiveKeys = [
      'PASSWORD',
      'SECRET',
      'API_KEY',
      'TOKEN',
      'PRIVATE_KEY',
      'DB_PASSWORD',
      'REDIS_PASSWORD',
      'JWT_SECRET'
    ];

    const keysToHash = sensitiveKeys.length > 0 
      ? sensitiveKeys 
      : defaultSensitiveKeys;

    for (const [key, value] of Object.entries(hashed)) {
      // 检查键名是否包含敏感词
      const isSensitive = keysToHash.some(sensitive => 
        key.toUpperCase().includes(sensitive)
      );

      if (isSensitive && value && typeof value === 'string') {
        // 跳过已经是哈希的值
        if (!this.isLikelyHash(value)) {
          hashed[`${key}_HASH`] = this.hash(value).hash;
          hashed[`${key}_HASHED`] = 'true';
          // 保留原值（生产环境应该删除）
          // delete hashed[key];
        }
      }
    }

    return hashed;
  }

  /**
   * 检查字符串是否可能是哈希值
   */
  isLikelyHash(str) {
    // 检查是否是常见的哈希格式
    const hashPatterns = [
      /^[a-f0-9]{64}$/, // SHA-256
      /^[a-f0-9]{128}$/, // SHA-512
      /^\$2[aby]\$\d+\$[A-Za-z0-9\.\/]{53}$/, // bcrypt
      /^\$1\$[A-Za-z0-9\.\/]{8}\$[A-Za-z0-9\.\/]{22}$/, // MD5-Crypt
      /^[a-f0-9]{40}$/ // SHA-1
    ];

    return hashPatterns.some(pattern => pattern.test(str));
  }

  /**
   * 生成密码强度报告
   * @param {string} password - 密码
   * @returns {object} - 强度报告
   */
  analyzePassword(password) {
    const report = {
      length: password.length,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      score: 0,
      strength: 'weak'
    };

    // 计算强度分数
    if (report.length >= 8) report.score += 1;
    if (report.length >= 12) report.score += 1;
    if (report.hasUpperCase) report.score += 1;
    if (report.hasLowerCase) report.score += 1;
    if (report.hasNumbers) report.score += 1;
    if (report.hasSpecialChars) report.score += 1;

    // 确定强度等级
    if (report.score >= 5) {
      report.strength = 'strong';
    } else if (report.score >= 3) {
      report.strength = 'medium';
    } else {
      report.strength = 'weak';
    }

    return report;
  }

  /**
   * 保存哈希配置
   * @param {object} config - 配置
   */
  saveConfig(config) {
    const configData = {
      iterations: config.iterations || 100000,
      keylen: config.keylen || 64,
      digest: config.digest || 'sha512',
      updated_at: Date.now()
    };

    fs.writeFileSync(
      this.hashConfigFile,
      JSON.stringify(configData, null, 2),
      { mode: 0o600 }
    );
  }

  /**
   * 加载哈希配置
   * @returns {object} - 配置
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.hashConfigFile)) {
        return JSON.parse(fs.readFileSync(this.hashConfigFile, 'utf8'));
      }
    } catch (e) {
      // 忽略错误
    }

    return {
      iterations: 100000,
      keylen: 64,
      digest: 'sha512'
    };
  }
}

module.exports = new PasswordHashService();
