const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const statsController = require('../controllers/stats.controller');

// 系统统计概览
router.get('/overview', authenticate, statsController.getOverview);

// 用户统计
router.get('/users', authenticate, statsController.getUserStats);

// 任务统计
router.get('/tasks', authenticate, statsController.getTaskStats);

// 审计统计
router.get('/audit', authenticate, statsController.getAuditStats);

// 资源详细统计
router.get('/resource/:type', authenticate, statsController.getResourceStats);

module.exports = router;
