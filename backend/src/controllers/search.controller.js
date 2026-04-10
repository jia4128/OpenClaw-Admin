const { query } = require('../utils/database');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// 全局搜索
async function globalSearch(req, res) {
  try {
    const { q, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    const searchResults = [];

    // 搜索用户
    const userSql = `SELECT id, name, email, 'user' as type FROM users WHERE name LIKE ? OR email LIKE ? LIMIT ? OFFSET ?`;
    const users = await query(userSql, [`%${q}%`, `%${q}%`, pageSize, offset]);
    searchResults.push(...users);

    // 搜索任务
    const taskSql = `SELECT id, title, status, 'task' as type FROM tasks WHERE title LIKE ? LIMIT ? OFFSET ?`;
    const tasks = await query(taskSql, [`%${q}%`, pageSize, offset]);
    searchResults.push(...tasks);

    // 搜索场景
    const scenarioSql = `SELECT id, name, 'scenario' as type FROM scenarios WHERE name LIKE ? LIMIT ? OFFSET ?`;
    const scenarios = await query(scenarioSql, [`%${q}%`, pageSize, offset]);
    searchResults.push(...scenarios);

    logger.info(`全局搜索：关键词 "${q}", 找到 ${searchResults.length} 条结果`);

    res.json({
      success: true,
      data: searchResults,
      total: searchResults.length,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    logger.error('全局搜索失败:', error.message);
    res.status(500).json({
      success: false,
      error: '全局搜索失败'
    });
  }
}

// 高级筛选
async function filterResources(req, res) {
  try {
    const { resource } = req.params;
    const { filters, page = 1, pageSize = 20, sortBy = 'created_at', sortOrder = 'DESC' } = req.body;

    let tableName;
    switch (resource) {
      case 'users': tableName = 'users'; break;
      case 'tasks': tableName = 'tasks'; break;
      case 'scenarios': tableName = 'scenarios'; break;
      case 'audit-logs': tableName = 'audit_logs'; break;
      default:
        return res.status(400).json({ success: false, error: '无效的资源类型' });
    }

    const conditions = [];
    const params = [];

    if (filters && Array.isArray(filters)) {
      filters.forEach(filter => {
        const { field, operator, value } = filter;
        const operatorMap = {
          eq: '=',
          neq: '!=',
          gt: '>',
          gte: '>=',
          lt: '<',
          lte: '<=',
          in: 'IN',
          contains: 'LIKE',
          like: 'LIKE'
        };

        const sqlOperator = operatorMap[operator];
        if (sqlOperator) {
          if (operator === 'in') {
            conditions.push(`${field} IN (${value.map(() => '?').join(',')})`);
            params.push(...value);
          } else if (operator === 'contains' || operator === 'like') {
            conditions.push(`${field} LIKE ?`);
            params.push(`%${value}%`);
          } else {
            conditions.push(`${field} ${sqlOperator} ?`);
            params.push(value);
          }
        }
      });
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const countSql = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;
    const [{ total }] = await query(countSql, params);

    const dataSql = `SELECT * FROM ${tableName} ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    const data = await query(dataSql, [...params, pageSize, offset]);

    res.json({
      success: true,
      data,
      total: parseInt(total),
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    logger.error('高级筛选失败:', error.message);
    res.status(500).json({
      success: false,
      error: '高级筛选失败'
    });
  }
}

// 搜索建议
async function searchSuggest(req, res) {
  try {
    const { q, type } = req.query;
    const limit = 10;

    let suggestions = [];

    if (!type || type === 'user') {
      const userSql = `SELECT name, email FROM users WHERE name LIKE ? LIMIT ?`;
      const users = await query(userSql, [`%${q}%`, limit]);
      suggestions.push(...users.map(u => ({ text: u.name, type: 'user' })));
    }

    if (!type || type === 'task') {
      const taskSql = `SELECT DISTINCT title FROM tasks WHERE title LIKE ? LIMIT ?`;
      const tasks = await query(taskSql, [`%${q}%`, limit]);
      suggestions.push(...tasks.map(t => ({ text: t.title, type: 'task' })));
    }

    if (!type || type === 'scenario') {
      const scenarioSql = `SELECT DISTINCT name FROM scenarios WHERE name LIKE ? LIMIT ?`;
      const scenarios = await query(scenarioSql, [`%${q}%`, limit]);
      suggestions.push(...scenarios.map(s => ({ text: s.name, type: 'scenario' })));
    }

    res.json({
      success: true,
      data: suggestions.slice(0, limit)
    });
  } catch (error) {
    logger.error('搜索建议失败:', error.message);
    res.status(500).json({
      success: false,
      error: '搜索建议失败'
    });
  }
}

module.exports = {
  globalSearch,
  filterResources,
  searchSuggest
};
