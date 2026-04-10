const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const rbacController = require('../controllers/rbac.controller');
const { authenticate, requirePermission } = require('../middleware/auth');

// 权限管理
router.get('/permissions',
  authenticate,
  requirePermission('rbac:permissions:read'),
  rbacController.getPermissions
);

router.post('/permissions',
  authenticate,
  requirePermission('rbac:permissions:create'),
  body('name').notEmpty().withMessage('权限名称不能为空'),
  body('resource').notEmpty().withMessage('资源类型不能为空'),
  body('action').notEmpty().withMessage('操作类型不能为空'),
  rbacController.createPermission
);

// 角色管理
router.get('/roles',
  authenticate,
  requirePermission('rbac:roles:read'),
  rbacController.getRoles
);

router.post('/roles',
  authenticate,
  requirePermission('rbac:roles:create'),
  body('name').notEmpty().withMessage('角色名称不能为空'),
  body('description').optional(),
  rbacController.createRole
);

router.get('/roles/:id',
  authenticate,
  requirePermission('rbac:roles:read'),
  rbacController.getRoleById
);

router.put('/roles/:id',
  authenticate,
  requirePermission('rbac:roles:update'),
  body('name').optional().notEmpty(),
  body('description').optional(),
  rbacController.updateRole
);

router.delete('/roles/:id',
  authenticate,
  requirePermission('rbac:roles:delete'),
  rbacController.deleteRole
);

// 角色权限分配
router.put('/roles/:id/permissions',
  authenticate,
  requirePermission('rbac:roles:update'),
  body('permissionIds').isArray({ min: 1 }).withMessage('至少需要一个权限 ID'),
  rbacController.assignRolePermissions
);

// 获取用户权限
router.get('/users/:userId/permissions',
  authenticate,
  requirePermission('rbac:users:read'),
  rbacController.getUserPermissions
);

// 权限检查
router.post('/check',
  authenticate,
  body('userId').notEmpty().withMessage('用户 ID 不能为空'),
  body('resource').notEmpty().withMessage('资源类型不能为空'),
  body('action').notEmpty().withMessage('操作类型不能为空'),
  rbacController.checkPermission
);

module.exports = router;
