const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const themesController = require('../controllers/themes.controller');
const { authenticate, requirePermission } = require('../middleware/auth');

// 获取主题列表
router.get('/',
  authenticate,
  themesController.getThemes
);

// 获取主题详情
router.get('/:id',
  authenticate,
  param('id').notEmpty().withMessage('主题 ID 不能为空'),
  themesController.getThemeById
);

// 创建自定义主题
router.post('/custom',
  authenticate,
  requirePermission('themes:create'),
  body('name').notEmpty().withMessage('主题名称不能为空'),
  body('colors').optional().isObject(),
  themesController.createCustomTheme
);

// 更新主题
router.put('/:id',
  authenticate,
  requirePermission('themes:update'),
  param('id').notEmpty().withMessage('主题 ID 不能为空'),
  body('name').optional().notEmpty(),
  body('colors').optional().isObject(),
  themesController.updateTheme
);

// 删除主题
router.delete('/:id',
  authenticate,
  requirePermission('themes:delete'),
  param('id').notEmpty().withMessage('主题 ID 不能为空'),
  themesController.deleteTheme
);

// 获取用户主题偏好
router.get('/user/theme-preference',
  authenticate,
  themesController.getUserThemePreference
);

// 更新用户主题偏好
router.put('/user/theme-preference',
  authenticate,
  body('themeId').notEmpty().withMessage('主题 ID 不能为空'),
  themesController.updateUserThemePreference
);

module.exports = router;
