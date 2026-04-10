/**
 * 认证路由
 * 处理认证相关的 API 路由
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const twoFactorController = require('../controllers/twoFactor.controller');
const wafService = require('../services/wafService');

// WAF 中间件
function wafMiddleware(req, res, next) {
  const check = wafService.checkRequest({
    ip: req.ip,
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });

  if (check && check.action === 'block') {
    return res.status(403).json({
      success: false,
      error: '请求被 WAF 拦截'
    });
  }

  next();
}

// 所有路由都应用 WAF 检查
router.use(wafMiddleware);

// 公开路由（不需要认证）
router.post('/login', authController.login.bind(authController));

// 需要认证的路由
router.post('/logout', authController.logout.bind(authController));
router.get('/me', authController.getMe.bind(authController));
router.post('/change-password', authController.changePassword.bind(authController));
router.post('/refresh', authController.refreshSession.bind(authController));
router.get('/sessions', authController.getMySessions.bind(authController));
router.post('/sessions/destroy', authController.destroySession.bind(authController));
router.post('/sessions/destroy-all-other', authController.destroyAllOtherSessions.bind(authController));

// 2FA 路由
router.get('/2fa/config', twoFactorController.getConfig.bind(twoFactorController));
router.post('/2fa/init', twoFactorController.init2FA.bind(twoFactorController));
router.post('/2fa/enable', twoFactorController.enable2FA.bind(twoFactorController));
router.post('/2fa/disable', twoFactorController.disable2FA.bind(twoFactorController));
router.post('/2fa/verify', twoFactorController.verifyToken.bind(twoFactorController));
router.post('/2fa/backup-code', twoFactorController.verifyBackupCode.bind(twoFactorController));

module.exports = router;
