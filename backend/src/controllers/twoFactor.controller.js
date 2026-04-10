/**
 * 双因素认证控制器
 * 处理 2FA 相关的 API 接口
 */

const twoFactorService = require('../services/twoFactorService');
const db = require('../models/database');
const sessionModel = require('../models/sessionModel');

class TwoFactorController {
  /**
   * 获取 2FA 配置信息
   */
  getConfig(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session) {
        return res.status(401).json({
          success: false,
          error: '会话无效或已过期'
        });
      }

      const config = twoFactorService.getConfig(session.user_id);

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('GetConfig error:', error);
      res.status(500).json({
        success: false,
        error: '获取 2FA 配置失败'
      });
    }
  }

  /**
   * 初始化 2FA（生成密钥和 QR 码）
   */
  init2FA(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session) {
        return res.status(401).json({
          success: false,
          error: '会话无效或已过期'
        });
      }

      // 检查是否已启用 2FA
      if (twoFactorService.isEnabled(session.user_id)) {
        return res.status(400).json({
          success: false,
          error: '2FA 已启用，请先禁用后再重新配置'
        });
      }

      const result = twoFactorService.generateSecret(session.user_id);

      res.json({
        success: true,
        data: {
          secret: result.secret,
          otpauth_url: result.otpauthUrl,
          qr_code: result.qrCode
        }
      });
    } catch (error) {
      console.error('Init2FA error:', error);
      res.status(500).json({
        success: false,
        error: '初始化 2FA 失败'
      });
    }
  }

  /**
   * 验证并启用 2FA
   */
  enable2FA(req, res) {
    try {
      const { token } = req.body;
      const authToken = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'TOTP 令牌不能为空'
        });
      }

      if (!authToken) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(authToken);
      if (!session) {
        return res.status(401).json({
          success: false,
          error: '会话无效或已过期'
        });
      }

      const result = twoFactorService.enable(session.user_id, token);

      if (!result) {
        return res.status(400).json({
          success: false,
          error: 'TOTP 令牌验证失败，请检查时间同步并重试'
        });
      }

      // 记录审计日志
      this.logAudit(session.user_id, session.username, '2fa_enabled', '/api/auth/2fa/enable', req, 'success');

      res.json({
        success: true,
        message: '2FA 启用成功',
        data: {
          backup_codes: result.backupCodes
        }
      });
    } catch (error) {
      console.error('Enable2FA error:', error);
      res.status(500).json({
        success: false,
        error: '启用 2FA 失败'
      });
    }
  }

  /**
   * 禁用 2FA
   */
  disable2FA(req, res) {
    try {
      const { token } = req.body;
      const authToken = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'TOTP 令牌不能为空'
        });
      }

      if (!authToken) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(authToken);
      if (!session) {
        return res.status(401).json({
          success: false,
          error: '会话无效或已过期'
        });
      }

      const success = twoFactorService.disable(session.user_id, token);

      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'TOTP 令牌验证失败'
        });
      }

      // 记录审计日志
      this.logAudit(session.user_id, session.username, '2fa_disabled', '/api/auth/2fa/disable', req, 'success');

      res.json({
        success: true,
        message: '2FA 已禁用'
      });
    } catch (error) {
      console.error('Disable2FA error:', error);
      res.status(500).json({
        success: false,
        error: '禁用 2FA 失败'
      });
    }
  }

  /**
   * 验证 TOTP 令牌（用于登录时的 2FA 验证）
   */
  verifyToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'TOTP 令牌不能为空'
        });
      }

      // 从请求中获取用户 ID（通常在登录流程中会临时存储）
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: '用户 ID 不能为空'
        });
      }

      const valid = twoFactorService.verifyToken(userId, token);

      if (!valid) {
        return res.status(400).json({
          success: false,
          error: 'TOTP 令牌验证失败'
        });
      }

      res.json({
        success: true,
        message: 'TOTP 令牌验证成功'
      });
    } catch (error) {
      console.error('VerifyToken error:', error);
      res.status(500).json({
        success: false,
        error: '验证 TOTP 令牌失败'
      });
    }
  }

  /**
   * 使用备份码登录
   */
  verifyBackupCode(req, res) {
    try {
      const { backup_code } = req.body;
      const authToken = req.headers.authorization?.replace('Bearer ', '');

      if (!backup_code) {
        return res.status(400).json({
          success: false,
          error: '备份码不能为空'
        });
      }

      if (!authToken) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(authToken);
      if (!session) {
        return res.status(401).json({
          success: false,
          error: '会话无效或已过期'
        });
      }

      const result = twoFactorService.verifyBackupCode(session.user_id, backup_code);

      if (!result) {
        return res.status(400).json({
          success: false,
          error: '备份码无效或已使用'
        });
      }

      res.json({
        success: true,
        message: '备份码验证成功',
        data: {
          remaining_codes: result.remaining
        }
      });
    } catch (error) {
      console.error('VerifyBackupCode error:', error);
      res.status(500).json({
        success: false,
        error: '验证备份码失败'
      });
    }
  }

  /**
   * 记录审计日志
   */
  logAudit(userId, username, action, resource, req, status) {
    try {
      const logId = require('crypto').randomUUID();
      const stmt = db.prepare(`
        INSERT INTO audit_logs (id, user_id, username, action, resource, ip_address, user_agent, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        logId,
        userId,
        username,
        action,
        resource,
        req.ip,
        req.get('user-agent'),
        status,
        Date.now()
      );
    } catch (e) {
      console.error('Failed to log audit:', e);
    }
  }
}

module.exports = new TwoFactorController();
