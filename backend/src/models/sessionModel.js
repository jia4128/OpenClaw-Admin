/**
 * 会话管理模型
 * 负责会话的创建、验证、持久化和销毁
 */

const db = require('./database');
const crypto = require('crypto');

class SessionModel {
  /**
   * 创建新会话
   * @param {string} userId - 用户 ID
   * @param {string} ipAddress - IP 地址
   * @param {string} userAgent - User-Agent
   * @param {number} expiresIn - 过期时间（秒），默认 7 天
   * @returns {object} - 会话信息
   */
  create(userId, ipAddress, userAgent, expiresIn = 604800) {
    const sessionId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + (expiresIn * 1000);

    const stmt = db.prepare(`
      INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at, last_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(sessionId, userId, token, ipAddress, userAgent, expiresAt, now);

    return {
      sessionId,
      token,
      userId,
      expiresAt
    };
  }

  /**
   * 通过 token 验证会话
   * @param {string} token - 会话 token
   * @returns {object|null} - 会话信息或 null
   */
  findByToken(token) {
    const stmt = db.prepare(`
      SELECT s.*, u.username, u.display_name, u.role, u.avatar
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.is_valid = 1 AND s.expires_at > ?
    `);

    const session = stmt.get(token, Date.now());
    
    if (session) {
      // 更新最后活跃时间
      this.updateLastActive(session.id);
    }

    return session;
  }

  /**
   * 通过会话 ID 获取会话
   * @param {string} sessionId - 会话 ID
   * @returns {object|null} - 会话信息或 null
   */
  findById(sessionId) {
    const stmt = db.prepare(`
      SELECT * FROM sessions WHERE id = ? AND is_valid = 1 AND expires_at > ?
    `);

    return stmt.get(sessionId, Date.now());
  }

  /**
   * 更新会话最后活跃时间
   * @param {string} sessionId - 会话 ID
   */
  updateLastActive(sessionId) {
    const stmt = db.prepare(`
      UPDATE sessions SET last_active = ? WHERE id = ?
    `);

    stmt.run(Date.now(), sessionId);
  }

  /**
   * 刷新会话过期时间
   * @param {string} sessionId - 会话 ID
   * @param {number} expiresIn - 新的过期时间（秒）
   * @returns {boolean} - 是否成功
   */
  refresh(sessionId, expiresIn = 604800) {
    const session = this.findById(sessionId);
    if (!session) return false;

    const newExpiresAt = Date.now() + (expiresIn * 1000);
    const stmt = db.prepare(`
      UPDATE sessions SET expires_at = ?, last_active = ? WHERE id = ?
    `);

    stmt.run(newExpiresAt, Date.now(), sessionId);
    return true;
  }

  /**
   * 销毁会话
   * @param {string} sessionId - 会话 ID
   * @returns {boolean} - 是否成功
   */
  destroy(sessionId) {
    const stmt = db.prepare(`
      UPDATE sessions SET is_valid = 0 WHERE id = ?
    `);

    const result = stmt.run(sessionId);
    return result.changes > 0;
  }

  /**
   * 销毁用户的所有会话
   * @param {string} userId - 用户 ID
   * @returns {number} - 销毁的会话数量
   */
  destroyAllByUser(userId) {
    const stmt = db.prepare(`
      UPDATE sessions SET is_valid = 0 WHERE user_id = ?
    `);

    const result = stmt.run(userId);
    return result.changes;
  }

  /**
   * 获取用户的所有有效会话
   * @param {string} userId - 用户 ID
   * @returns {Array} - 会话列表
   */
  findAllByUser(userId) {
    const stmt = db.prepare(`
      SELECT id, ip_address, user_agent, created_at, last_active, expires_at
      FROM sessions
      WHERE user_id = ? AND is_valid = 1 AND expires_at > ?
      ORDER BY created_at DESC
    `);

    return stmt.all(userId, Date.now());
  }

  /**
   * 清理过期会话
   * @returns {number} - 清理的会话数量
   */
  cleanupExpired() {
    const stmt = db.prepare(`
      UPDATE sessions SET is_valid = 0 WHERE expires_at <= ?
    `);

    const result = stmt.run(Date.now());
    return result.changes;
  }

  /**
   * 验证会话是否有效
   * @param {string} sessionId - 会话 ID
   * @returns {boolean} - 是否有效
   */
  isValid(sessionId) {
    const session = this.findById(sessionId);
    return !!session;
  }
}

module.exports = new SessionModel();
