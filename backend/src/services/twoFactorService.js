/**
 * 双因素认证 (2FA) 服务
 * 基于 TOTP (Time-based One-Time Password) 实现
 */

const crypto = require('crypto');
const db = require('./database');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

class TwoFactorAuthService {
  /**
   * 为启用户生成 2FA 密钥
   * @param {string} userId - 用户 ID
   * @returns {object} - 包含 secret 和 QR 码 URL 的对象
   */
  generateSecret(userId) {
    // 检查是否已存在 2FA 配置
    const existing = db.prepare('SELECT * FROM two_factor_auth WHERE user_id = ?').get(userId);
    
    let secret;
    if (existing && existing.secret) {
      secret = existing.secret;
    } else {
      secret = speakeasy.generateSecret({
        length: 20,
        name: `OpenClaw-Admin:${userId}`,
        issuer: 'OpenClaw-Admin'
      }).base32;

      // 保存密钥
      db.prepare(`
        INSERT INTO two_factor_auth (user_id, secret, enabled, created_at)
        VALUES (?, ?, 0, ?)
        ON CONFLICT(user_id) DO UPDATE SET secret = ?, enabled = 0
      `).run(userId, secret, Date.now(), secret);
    }

    // 生成 QR 码 URL
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret,
      label: `OpenClaw-Admin:${userId}`,
      issuer: 'OpenClaw-Admin'
    });

    return {
      secret,
      otpauthUrl,
      qrCode: qrcode.toDataURL(otpauthUrl)
    };
  }

  /**
   * 验证 TOTP 令牌
   * @param {string} userId - 用户 ID
   * @param {string} token - TOTP 令牌
   * @returns {boolean} - 验证结果
   */
  verifyToken(userId, token) {
    const config = db.prepare('SELECT * FROM two_factor_auth WHERE user_id = ?').get(userId);
    
    if (!config || !config.secret || !config.enabled) {
      return false;
    }

    const verified = speakeasy.totp.verify({
      secret: config.secret,
      encoding: 'base32',
      token: token,
      window: 1 // 允许前后 1 个时间窗口的容差
    });

    return verified;
  }

  /**
   * 启用 2FA
   * @param {string} userId - 用户 ID
   * @param {string} token - 验证令牌
   * @returns {boolean} - 是否成功
   */
  enable(userId, token) {
    const config = db.prepare('SELECT * FROM two_factor_auth WHERE user_id = ?').get(userId);
    
    if (!config || !config.secret) {
      return false;
    }

    // 验证令牌
    const verified = speakeasy.totp.verify({
      secret: config.secret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (!verified) {
      return false;
    }

    // 生成备份码
    const backupCodes = this.generateBackupCodes();

    // 启用 2FA
    db.prepare(`
      UPDATE two_factor_auth 
      SET enabled = 1, backup_codes = ?, updated_at = ?
      WHERE user_id = ?
    `).run(JSON.stringify(backupCodes), Date.now(), userId);

    return {
      success: true,
      backupCodes
    };
  }

  /**
   * 禁用 2FA
   * @param {string} userId - 用户 ID
   * @param {string} token - 验证令牌
   * @returns {boolean} - 是否成功
   */
  disable(userId, token) {
    // 先验证令牌
    if (!this.verifyToken(userId, token)) {
      return false;
    }

    // 禁用 2FA
    db.prepare(`
      UPDATE two_factor_auth 
      SET enabled = 0, secret = NULL, backup_codes = '[]', updated_at = ?
      WHERE user_id = ?
    `).run(Date.now(), userId);

    return true;
  }

  /**
   * 验证 2FA 是否已启用
   * @param {string} userId - 用户 ID
   * @returns {boolean} - 是否启用
   */
  isEnabled(userId) {
    const config = db.prepare('SELECT enabled FROM two_factor_auth WHERE user_id = ?').get(userId);
    return config && config.enabled === 1;
  }

  /**
   * 验证备份码
   * @param {string} userId - 用户 ID
   * @param {string} backupCode - 备份码
   * @returns {object|null} - 验证结果
   */
  verifyBackupCode(userId, backupCode) {
    const config = db.prepare('SELECT * FROM two_factor_auth WHERE user_id = ?').get(userId);
    
    if (!config || !config.enabled) {
      return null;
    }

    const backupCodes = JSON.parse(config.backup_codes || '[]');
    const index = backupCodes.indexOf(backupCode);

    if (index === -1) {
      return null;
    }

    // 使用过的备份码需要标记为已使用（这里简化处理，实际应该删除）
    backupCodes.splice(index, 1);
    db.prepare(`
      UPDATE two_factor_auth SET backup_codes = ?, updated_at = ? WHERE user_id = ?
    `).run(JSON.stringify(backupCodes), Date.now(), userId);

    return {
      valid: true,
      remaining: backupCodes.length
    };
  }

  /**
   * 生成备份码
   * @returns {Array} - 备份码列表
   */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(8).toString('hex').substring(0, 8);
      codes.push(code);
    }
    return codes;
  }

  /**
   * 获取 2FA 配置信息
   * @param {string} userId - 用户 ID
   * @returns {object|null} - 配置信息
   */
  getConfig(userId) {
    const config = db.prepare('SELECT enabled, backup_codes FROM two_factor_auth WHERE user_id = ?').get(userId);
    if (!config) return null;
    
    return {
      enabled: config.enabled === 1,
      backupCodesCount: JSON.parse(config.backup_codes || '[]').length
    };
  }
}

module.exports = new TwoFactorAuthService();
