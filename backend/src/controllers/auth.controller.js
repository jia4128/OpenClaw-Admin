/**
 * 认证控制器
 * 处理用户登录、登出、会话管理等认证相关功能
 */

const sessionModel = require('../models/sessionModel');
const twoFactorService = require('../services/twoFactorService');
const { hash, compareHash } = require('../utils/sensitiveData');
const db = require('../models/database');
const crypto = require('crypto');

class AuthController {
  /**
   * 用户登录
   */
  async login(req, res) {
    try {
      const { username, password, totp_token } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: '用户名和密码不能为空'
        });
      }

      // 查找用户
      const user = db.prepare('SELECT * FROM users WHERE username = ? AND status = "active"').get(username);
      
      if (!user) {
        // 使用恒定时间比较防止时序攻击
        hash('dummy', 'prevent_timing_attack');
        return res.status(401).json({
          success: false,
          error: '用户名或密码错误'
        });
      }

      // 验证密码
      const passwordValid = compareHash(password, user.password_hash);
      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          error: '用户名或密码错误'
        });
      }

      // 检查是否需要 2FA
      const needs2FA = twoFactorService.isEnabled(user.id);
      
      if (needs2FA) {
        if (!totp_token) {
          return res.status(401).json({
            success: false,
            error: '需要提供 2FA 验证码',
            requires_2fa: true
          });
        }

        // 验证 2FA 令牌
        const totpValid = twoFactorService.verifyToken(user.id, totp_token);
        if (!totpValid) {
          return res.status(401).json({
            success: false,
            error: '2FA 验证码错误'
          });
        }
      }

      // 创建会话
      const session = sessionModel.create(
        user.id,
        req.ip,
        req.get('user-agent')
      );

      // 更新用户最后登录时间
      db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(Date.now(), user.id);

      // 记录审计日志
      this.logAudit(user.id, username, 'login', '/api/auth/login', req, 'success');

      res.json({
        success: true,
        data: {
          token: session.token,
          user: {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            role: user.role,
            avatar: user.avatar
          },
          requires_2fa: false
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: '登录失败，请稍后重试'
      });
    }
  }

  /**
   * 用户登出
   */
  logout(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        const session = sessionModel.findByToken(token);
        if (session) {
          sessionModel.destroy(session.id);
          this.logAudit(session.user_id, session.username, 'logout', '/api/auth/logout', req, 'success');
        }
      }

      res.json({
        success: true,
        message: '登出成功'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: '登出失败'
      });
    }
  }

  /**
   * 获取当前用户信息
   */
  getMe(req, res) {
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

      res.json({
        success: true,
        data: {
          id: session.id,
          username: session.username,
          display_name: session.display_name,
          role: session.role,
          email: session.email,
          avatar: session.avatar,
          created_at: session.created_at,
          two_factor_enabled: twoFactorService.isEnabled(session.user_id)
        }
      });
    } catch (error) {
      console.error('GetMe error:', error);
      res.status(500).json({
        success: false,
        error: '获取用户信息失败'
      });
    }
  }

  /**
   * 修改密码
   */
  async changePassword(req, res) {
    try {
      const { old_password, new_password } = req.body;
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!old_password || !new_password) {
        return res.status(400).json({
          success: false,
          error: '旧密码和新密码不能为空'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      // 获取用户信息
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: '用户不存在'
        });
      }

      // 验证旧密码
      const oldPasswordValid = compareHash(old_password, user.password_hash);
      if (!oldPasswordValid) {
        return res.status(401).json({
          success: false,
          error: '旧密码错误'
        });
      }

      // 验证新密码强度
      if (new_password.length < 8) {
        return res.status(400).json({
          success: false,
          error: '新密码长度至少为 8 位'
        });
      }

      // 哈希新密码
      const newPasswordHash = hash(new_password);

      // 更新密码
      db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
        .run(newPasswordHash, Date.now(), user.id);

      // 记录审计日志
      this.logAudit(user.id, user.username, 'change_password', '/api/auth/change-password', req, 'success');

      // 如果启用了 2FA，可以选择性地使所有其他会话失效
      if (twoFactorService.isEnabled(user.id)) {
        // 保留当前会话，销毁其他会话
        const currentSessionId = session.id;
        const sessions = sessionModel.findAllByUser(user.id);
        for (const s of sessions) {
          if (s.id !== currentSessionId) {
            sessionModel.destroy(s.id);
          }
        }
      }

      res.json({
        success: true,
        message: '密码修改成功'
      });
    } catch (error) {
      console.error('ChangePassword error:', error);
      res.status(500).json({
        success: false,
        error: '修改密码失败'
      });
    }
  }

  /**
   * 刷新会话
   */
  refreshSession(req, res) {
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

      sessionModel.refresh(session.id);

      res.json({
        success: true,
        message: '会话已刷新'
      });
    } catch (error) {
      console.error('RefreshSession error:', error);
      res.status(500).json({
        success: false,
        error: '刷新会话失败'
      });
    }
  }

  /**
   * 获取用户的所有会话
   */
  getMySessions(req, res) {
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

      const sessions = sessionModel.findAllByUser(session.user_id);

      res.json({
        success: true,
        data: sessions.map(s => ({
          id: s.id,
          ip_address: s.ip_address,
          user_agent: s.user_agent,
          created_at: s.created_at,
          last_active: s.last_active,
          expires_at: s.expires_at,
          is_current: s.id === session.id
        }))
      });
    } catch (error) {
      console.error('GetMySessions error:', error);
      res.status(500).json({
        success: false,
        error: '获取会话列表失败'
      });
    }
  }

  /**
   * 销毁指定会话
   */
  destroySession(req, res) {
    try {
      const { sessionId } = req.body;
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: '会话 ID 不能为空'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      // 不能销毁当前会话
      if (sessionId === session.id) {
        return res.status(400).json({
          success: false,
          error: '不能销毁当前会话，请先登出'
        });
      }

      sessionModel.destroy(sessionId);

      res.json({
        success: true,
        message: '会话已销毁'
      });
    } catch (error) {
      console.error('DestroySession error:', error);
      res.status(500).json({
        success: false,
        error: '销毁会话失败'
      });
    }
  }

  /**
   * 销毁用户的所有其他会话
   */
  destroyAllOtherSessions(req, res) {
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

      const sessions = sessionModel.findAllByUser(session.user_id);
      let destroyedCount = 0;

      for (const s of sessions) {
        if (s.id !== session.id) {
          sessionModel.destroy(s.id);
          destroyedCount++;
        }
      }

      res.json({
        success: true,
        message: `已销毁 ${destroyedCount} 个其他会话`
      });
    } catch (error) {
      console.error('DestroyAllOtherSessions error:', error);
      res.status(500).json({
        success: false,
        error: '销毁会话失败'
      });
    }
  }

  /**
   * 记录审计日志
   */
  logAudit(userId, username, action, resource, req, status) {
    try {
      const logId = crypto.randomUUID();
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

module.exports = new AuthController();
