/**
 * WAF (Web Application Firewall) 服务
 * 实现 Web 应用防火墙规则引擎
 */

const db = require('../models/database');
const { mask } = require('../utils/sensitiveData');

class WAFService {
  /**
   * 获取所有 WAF 规则
   * @returns {Array} - WAF 规则列表
   */
  getAllRules() {
    const stmt = db.prepare(`
      SELECT * FROM waf_rules WHERE enabled = 1 ORDER BY priority DESC
    `);
    return stmt.all();
  }

  /**
   * 获取单个 WAF 规则
   * @param {string} ruleId - 规则 ID
   * @returns {object|null} - 规则信息
   */
  getRule(ruleId) {
    const stmt = db.prepare('SELECT * FROM waf_rules WHERE id = ?');
    return stmt.get(ruleId);
  }

  /**
   * 创建 WAF 规则
   * @param {object} ruleData - 规则数据
   * @returns {string} - 创建的规则 ID
   */
  createRule(ruleData) {
    const ruleId = require('crypto').randomUUID();
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO waf_rules (id, name, description, rule_type, condition, action, priority, enabled, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `);

    stmt.run(
      ruleId,
      ruleData.name,
      ruleData.description || '',
      ruleData.rule_type,
      JSON.stringify(ruleData.condition),
      ruleData.action,
      ruleData.priority || 0,
      ruleData.created_by || 'system',
      now,
      now
    );

    return ruleId;
  }

  /**
   * 更新 WAF 规则
   * @param {string} ruleId - 规则 ID
   * @param {object} ruleData - 规则数据
   * @returns {boolean} - 是否成功
   */
  updateRule(ruleId, ruleData) {
    const stmt = db.prepare(`
      UPDATE waf_rules 
      SET name = ?, description = ?, rule_type = ?, condition = ?, action = ?, priority = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      ruleData.name,
      ruleData.description || '',
      ruleData.rule_type,
      JSON.stringify(ruleData.condition),
      ruleData.action,
      ruleData.priority || 0,
      Date.now(),
      ruleId
    );

    return result.changes > 0;
  }

  /**
   * 删除 WAF 规则
   * @param {string} ruleId - 规则 ID
   * @returns {boolean} - 是否成功
   */
  deleteRule(ruleId) {
    const stmt = db.prepare('DELETE FROM waf_rules WHERE id = ?');
    const result = stmt.run(ruleId);
    return result.changes > 0;
  }

  /**
   * 启用/禁用 WAF 规则
   * @param {string} ruleId - 规则 ID
   * @param {boolean} enabled - 是否启用
   * @returns {boolean} - 是否成功
   */
  toggleRule(ruleId, enabled) {
    const stmt = db.prepare('UPDATE waf_rules SET enabled = ?, updated_at = ? WHERE id = ?');
    const result = stmt.run(enabled ? 1 : 0, Date.now(), ruleId);
    return result.changes > 0;
  }

  /**
   * 检查请求是否匹配 WAF 规则
   * @param {object} request - 请求对象
   * @returns {object|null} - 匹配的规则或 null
   */
  checkRequest(request) {
    const rules = this.getAllRules();
    const { ip, method, url, headers, body } = request;

    for (const rule of rules) {
      const condition = JSON.parse(rule.condition);
      if (this.matchCondition(rule.rule_type, condition, { ip, method, url, headers, body })) {
        // 记录 WAF 日志
        this.logWafEvent(rule, ip, method, url, headers['user-agent'] || '', rule.action);
        return { rule, action: rule.action };
      }
    }

    return null;
  }

  /**
   * 匹配规则条件
   * @param {string} ruleType - 规则类型
   * @param {object} condition - 条件配置
   * @param {object} request - 请求信息
   * @returns {boolean} - 是否匹配
   */
  matchCondition(ruleType, condition, request) {
    switch (ruleType) {
      case 'ip_block':
        return this.matchIpBlock(condition, request.ip);
      
      case 'url_filter':
        return this.matchUrlFilter(condition, request.url);
      
      case 'rate_limit':
        return this.matchRateLimit(condition, request.ip, request.url);
      
      case 'pattern_match':
        return this.matchPattern(condition, request);
      
      default:
        return false;
    }
  }

  /**
   * IP 黑名单匹配
   */
  matchIpBlock(condition, ip) {
    const blockedIps = condition.blocked_ips || [];
    const blockedRanges = condition.blocked_ranges || [];

    // 精确匹配
    if (blockedIps.includes(ip)) {
      return true;
    }

    // CIDR 范围匹配（简化实现）
    for (const range of blockedRanges) {
      if (this.ipInCidr(ip, range)) {
        return true;
      }
    }

    return false;
  }

  /**
   * URL 过滤匹配
   */
  matchUrlFilter(condition, url) {
    const blockedPaths = condition.blocked_paths || [];
    const blockedPatterns = condition.blocked_patterns || [];

    // 路径匹配
    if (blockedPaths.some(path => url.startsWith(path))) {
      return true;
    }

    // 正则匹配
    for (const pattern of blockedPatterns) {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(url)) {
          return true;
        }
      } catch (e) {
        // 无效正则，跳过
      }
    }

    return false;
  }

  /**
   * 速率限制匹配
   */
  matchRateLimit(condition, ip, url) {
    const threshold = condition.threshold || 100;
    const windowSeconds = condition.window_seconds || 60;
    const windowMs = windowSeconds * 1000;
    const now = Date.now();

    // 查询该 IP 在时间窗口内的请求数
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM waf_logs 
      WHERE ip_address = ? AND created_at > ?
    `);

    const result = stmt.get(ip, now - windowMs);
    return result.count >= threshold;
  }

  /**
   * 模式匹配（请求体、Header 等）
   */
  matchPattern(condition, request) {
    const patterns = condition.patterns || [];
    const targets = condition.targets || ['body', 'url', 'headers'];

    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern, condition.case_sensitive ? '' : 'i');

        // 检查 URL
        if (targets.includes('url') && regex.test(request.url)) {
          return true;
        }

        // 检查 Body
        if (targets.includes('body') && request.body) {
          const bodyStr = JSON.stringify(request.body);
          if (regex.test(bodyStr)) {
            return true;
          }
        }

        // 检查 Headers
        if (targets.includes('headers') && request.headers) {
          for (const [key, value] of Object.entries(request.headers)) {
            if (regex.test(value || '')) {
              return true;
            }
          }
        }
      } catch (e) {
        // 无效正则，跳过
      }
    }

    return false;
  }

  /**
   * IP 是否在 CIDR 范围内（简化实现）
   */
  ipInCidr(ip, cidr) {
    // 简化实现：只支持 /24 网段
    if (cidr.endsWith('/24')) {
      const network = cidr.replace('/24', '');
      return ip.startsWith(network);
    }
    return false;
  }

  /**
   * 记录 WAF 事件
   */
  logWafEvent(rule, ip, method, url, userAgent, action) {
    const logId = require('crypto').randomUUID();
    const stmt = db.prepare(`
      INSERT INTO waf_logs (id, rule_id, ip_address, method, url, user_agent, matched_pattern, action, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      logId,
      rule.id,
      ip,
      method,
      url,
      userAgent,
      rule.name,
      action,
      Date.now()
    );
  }

  /**
   * 获取 WAF 日志
   * @param {object} options - 查询选项
   * @returns {Array} - 日志列表
   */
  getWafLogs(options = {}) {
    const { limit = 100, ruleId, ipAddress, startDate, endDate } = options;
    
    let sql = 'SELECT * FROM waf_logs WHERE 1=1';
    const params = [];

    if (ruleId) {
      sql += ' AND rule_id = ?';
      params.push(ruleId);
    }

    if (ipAddress) {
      sql += ' AND ip_address = ?';
      params.push(ipAddress);
    }

    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }

  /**
   * 获取 WAF 统计信息
   */
  getWafStats(startDate, endDate) {
    let sql = `
      SELECT 
        COUNT(*) as total_blocks,
        COUNT(DISTINCT ip_address) as unique_ips,
        COUNT(DISTINCT rule_id) as rules_triggered
      FROM waf_logs 
      WHERE created_at > ?
    `;
    const params = [startDate || Date.now() - 86400000]; // 默认最近 24 小时

    if (endDate) {
      sql += ' AND created_at < ?';
      params.push(endDate);
    }

    const stmt = db.prepare(sql);
    return stmt.get(...params);
  }
}

module.exports = new WAFService();
