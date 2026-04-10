/**
 * WAF 控制器
 * 处理 WAF 规则管理的 API 接口
 */

const wafService = require('../services/wafService');
const sessionModel = require('../models/sessionModel');

class WAFController {
  /**
   * 获取所有 WAF 规则
   */
  getAllRules(req, res) {
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

      // 只有 admin 角色可以查看 WAF 规则
      if (session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '没有权限访问 WAF 规则'
        });
      }

      const rules = wafService.getAllRules();

      res.json({
        success: true,
        data: rules
      });
    } catch (error) {
      console.error('GetAllRules error:', error);
      res.status(500).json({
        success: false,
        error: '获取 WAF 规则失败'
      });
    }
  }

  /**
   * 获取单个 WAF 规则
   */
  getRule(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { ruleId } = req.params;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session || session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '没有权限访问 WAF 规则'
        });
      }

      const rule = wafService.getRule(ruleId);

      if (!rule) {
        return res.status(404).json({
          success: false,
          error: '规则不存在'
        });
      }

      res.json({
        success: true,
        data: rule
      });
    } catch (error) {
      console.error('GetRule error:', error);
      res.status(500).json({
        success: false,
        error: '获取 WAF 规则失败'
      });
    }
  }

  /**
   * 创建 WAF 规则
   */
  createRule(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const ruleData = req.body;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session || session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '没有权限创建 WAF 规则'
        });
      }

      // 验证必填字段
      if (!ruleData.name || !ruleData.rule_type || !ruleData.action || !ruleData.condition) {
        return res.status(400).json({
          success: false,
          error: '缺少必填字段：name, rule_type, action, condition'
        });
      }

      const ruleId = wafService.createRule({
        ...ruleData,
        created_by: session.username
      });

      // 记录审计日志
      this.logAudit(session.user_id, session.username, 'waf_rule_created', `/api/waf/rules/${ruleId}`, req, 'success');

      res.status(201).json({
        success: true,
        message: 'WAF 规则创建成功',
        data: { rule_id: ruleId }
      });
    } catch (error) {
      console.error('CreateRule error:', error);
      res.status(500).json({
        success: false,
        error: '创建 WAF 规则失败'
      });
    }
  }

  /**
   * 更新 WAF 规则
   */
  updateRule(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { ruleId } = req.params;
      const ruleData = req.body;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session || session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '没有权限更新 WAF 规则'
        });
      }

      const success = wafService.updateRule(ruleId, ruleData);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: '规则不存在'
        });
      }

      // 记录审计日志
      this.logAudit(session.user_id, session.username, 'waf_rule_updated', `/api/waf/rules/${ruleId}`, req, 'success');

      res.json({
        success: true,
        message: 'WAF 规则更新成功'
      });
    } catch (error) {
      console.error('UpdateRule error:', error);
      res.status(500).json({
        success: false,
        error: '更新 WAF 规则失败'
      });
    }
  }

  /**
   * 删除 WAF 规则
   */
  deleteRule(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { ruleId } = req.params;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session || session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '没有权限删除 WAF 规则'
        });
      }

      const success = wafService.deleteRule(ruleId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: '规则不存在'
        });
      }

      // 记录审计日志
      this.logAudit(session.user_id, session.username, 'waf_rule_deleted', `/api/waf/rules/${ruleId}`, req, 'success');

      res.json({
        success: true,
        message: 'WAF 规则删除成功'
      });
    } catch (error) {
      console.error('DeleteRule error:', error);
      res.status(500).json({
        success: false,
        error: '删除 WAF 规则失败'
      });
    }
  }

  /**
   * 启用/禁用 WAF 规则
   */
  toggleRule(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { ruleId } = req.params;
      const { enabled } = req.body;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session || session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '没有权限修改 WAF 规则状态'
        });
      }

      if (enabled === undefined) {
        return res.status(400).json({
          success: false,
          error: '需要提供 enabled 字段'
        });
      }

      const success = wafService.toggleRule(ruleId, enabled);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: '规则不存在'
        });
      }

      // 记录审计日志
      this.logAudit(session.user_id, session.username, `waf_rule_${enabled ? 'enabled' : 'disabled'}`, `/api/waf/rules/${ruleId}`, req, 'success');

      res.json({
        success: true,
        message: `WAF 规则已${enabled ? '启用' : '禁用'}`
      });
    } catch (error) {
      console.error('ToggleRule error:', error);
      res.status(500).json({
        success: false,
        error: '修改 WAF 规则状态失败'
      });
    }
  }

  /**
   * 获取 WAF 日志
   */
  getWafLogs(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { rule_id, ip_address, start_date, end_date, limit } = req.query;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session || session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '没有权限访问 WAF 日志'
        });
      }

      const logs = wafService.getWafLogs({
        ruleId: rule_id,
        ipAddress: ip_address,
        startDate: start_date ? parseInt(start_date) : undefined,
        endDate: end_date ? parseInt(end_date) : undefined,
        limit: limit ? parseInt(limit) : 100
      });

      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      console.error('GetWafLogs error:', error);
      res.status(500).json({
        success: false,
        error: '获取 WAF 日志失败'
      });
    }
  }

  /**
   * 获取 WAF 统计信息
   */
  getWafStats(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { start_date, end_date } = req.query;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session || session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '没有权限访问 WAF 统计信息'
        });
      }

      const stats = wafService.getWafStats(
        start_date ? parseInt(start_date) : undefined,
        end_date ? parseInt(end_date) : undefined
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('GetWafStats error:', error);
      res.status(500).json({
        success: false,
        error: '获取 WAF 统计信息失败'
      });
    }
  }

  /**
   * 记录审计日志
   */
  logAudit(userId, username, action, resource, req, status) {
    try {
      const logId = require('crypto').randomUUID();
      const db = require('../models/database');
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

module.exports = new WAFController();
