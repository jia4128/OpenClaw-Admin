/**
 * CI/CD 扫描路由
 * 处理 CI/CD 安全扫描相关的 API 路由
 */

const express = require('express');
const router = express.Router();
const cicdScanController = require('../controllers/cicdScan.controller');
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

// 获取扫描任务列表
router.get('/scans', cicdScanController.getScans.bind(cicdScanController));

// 获取单个扫描任务详情
router.get('/scans/:scanId', cicdScanController.getScan.bind(cicdScanController));

// 创建扫描任务
router.post('/scans', cicdScanController.createScan.bind(cicdScanController));

// 执行 SAST 扫描
router.post('/scans/sast', cicdScanController.runSAST.bind(cicdScanController));

// 执行 DAST 扫描
router.post('/scans/dast', cicdScanController.runDAST.bind(cicdScanController));

// 执行依赖扫描
router.post('/scans/dependency', cicdScanController.runDependencyScan.bind(cicdScanController));

// 执行密钥检测
router.post('/scans/secret', cicdScanController.runSecretScan.bind(cicdScanController));

// 获取扫描结果
router.get('/scans/:scanId/results', cicdScanController.getScanResults.bind(cicdScanController));

// 获取扫描统计信息
router.get('/stats', cicdScanController.getScanStats.bind(cicdScanController));

module.exports = router;
