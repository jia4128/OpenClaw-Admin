/**
 * WAF 路由
 * 处理 WAF 规则管理的 API 路由
 */

const express = require('express');
const router = express.Router();
const wafController = require('../controllers/waf.controller');
const sessionModel = require('../models/sessionModel');

// 认证中间件
function authMiddleware(req, res, next) {
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

  req.session = session;
  next();
}

// 所有路由都需要认证
router.use(authMiddleware);

// 获取所有 WAF 规则
router.get('/rules', wafController.getAllRules.bind(wafController));

// 获取单个 WAF 规则
router.get('/rules/:ruleId', wafController.getRule.bind(wafController));

// 创建 WAF 规则
router.post('/rules', wafController.createRule.bind(wafController));

// 更新 WAF 规则
router.put('/rules/:ruleId', wafController.updateRule.bind(wafController));

// 删除 WAF 规则
router.delete('/rules/:ruleId', wafController.deleteRule.bind(wafController));

// 启用/禁用 WAF 规则
router.patch('/rules/:ruleId/toggle', wafController.toggleRule.bind(wafController));

// 获取 WAF 日志
router.get('/logs', wafController.getWafLogs.bind(wafController));

// 获取 WAF 统计信息
router.get('/stats', wafController.getWafStats.bind(wafController));

module.exports = router;
