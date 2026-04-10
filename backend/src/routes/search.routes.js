const express = require('express');
const router = express.Router();
const { query: queryValidator, param } = require('express-validator');
const searchController = require('../controllers/search.controller');
const { authenticate, requirePermission } = require('../middleware/auth');

// 全局搜索
router.get('/global',
  authenticate,
  queryValidator('q').notEmpty().withMessage('搜索关键词不能为空'),
  queryValidator('page').optional().isInt({ min: 1 }).withMessage('页码必须大于 0'),
  queryValidator('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在 1-100 之间'),
  searchController.globalSearch
);

// 高级筛选
router.post('/:resource/filter',
  authenticate,
  param('resource').isIn(['users', 'tasks', 'scenarios', 'audit-logs']),
  searchController.filterResources
);

// 搜索建议
router.get('/suggest',
  authenticate,
  queryValidator('q').notEmpty().withMessage('搜索关键词不能为空'),
  queryValidator('type').optional().isIn(['user', 'task', 'scenario']).withMessage('类型无效'),
  searchController.searchSuggest
);

module.exports = router;
