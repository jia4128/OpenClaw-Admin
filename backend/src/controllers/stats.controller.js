const { query } = require('../utils/database');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// 系统统计概览
async function getOverview(req, res) {
  try {
    const [userCount, taskCount, scenarioCount] = await Promise.all([
      query('SELECT COUNT(*) as total FROM users'),
      query('SELECT COUNT(*) as total FROM tasks'),
      query('SELECT COUNT(*) as total FROM scenarios')
    ]);

    res.json({
      success: true,
      data: {
        users: parseInt(userCount[0].total),
        tasks: parseInt(taskCount[0].total),
        scenarios: parseInt(scenarioCount[0].total)
      }
    });
  } catch (error) {
    logger.error('获取系统统计失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取系统统计失败'
    });
  }
}

// 用户统计
async function getUserStats(req, res) {
  try {
    const [totalCount, activeCount, roleCount] = await Promise.all([
      query('SELECT COUNT(*) as total FROM users'),
      query('SELECT COUNT(*) as total FROM users WHERE status = "active"'),
      query(`
        SELECT r.name, COUNT(ur.user_id) as count 
        FROM roles r 
        LEFT JOIN user_roles ur ON r.id = ur.role_id 
        GROUP BY r.id, r.name
      `)
    ]);

    res.json({
      success: true,
      data: {
        total: parseInt(totalCount[0].total),
        active: parseInt(activeCount[0].total),
        byRole: roleCount
      }
    });
  } catch (error) {
    logger.error('获取用户统计失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取用户统计失败'
    });
  }
}

// 任务统计
async function getTaskStats(req, res) {
  try {
    const [totalCount, statusCount, priorityCount] = await Promise.all([
      query('SELECT COUNT(*) as total FROM tasks'),
      query('SELECT status, COUNT(*) as count FROM tasks GROUP BY status'),
      query('SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority')
    ]);

    const completed = await query("SELECT COUNT(*) as total FROM tasks WHERE status = 'completed'");

    res.json({
      success: true,
      data: {
        total: parseInt(totalCount[0].total),
        byStatus: statusCount,
        byPriority: priorityCount,
        completionRate: totalCount[0].total > 0 
          ? (parseInt(completed[0].total) / parseInt(totalCount[0].total) * 100).toFixed(2) 
          : 0
      }
    });
  } catch (error) {
    logger.error('获取任务统计失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取任务统计失败'
    });
  }
}

// 审计统计
async function getAuditStats(req, res) {
  try {
    const [totalCount, actionCount, userCount] = await Promise.all([
      query('SELECT COUNT(*) as total FROM audit_logs'),
      query('SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action'),
      query('SELECT user_id, COUNT(*) as count FROM audit_logs GROUP BY user_id ORDER BY count DESC LIMIT 10')
    ]);

    res.json({
      success: true,
      data: {
        total: parseInt(totalCount[0].total),
        byAction: actionCount,
        topUsers: userCount
      }
    });
  } catch (error) {
    logger.error('获取审计统计失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取审计统计失败'
    });
  }
}

// 资源详细统计
async function getResourceStats(req, res) {
  try {
    const { type } = req.params;

    let tableName;
    switch (type) {
      case 'users': tableName = 'users'; break;
      case 'tasks': tableName = 'tasks'; break;
      case 'scenarios': tableName = 'scenarios'; break;
      default:
        return res.status(400).json({ success: false, error: '无效的资源类型' });
    }

    const countSql = `SELECT COUNT(*) as total FROM ${tableName}`;
    const [{ total }] = await query(countSql);

    res.json({
      success: true,
      data: {
        type,
        total: parseInt(total)
      }
    });
  } catch (error) {
    logger.error('获取资源统计失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取资源统计失败'
    });
  }
}

module.exports = {
  getOverview,
  getUserStats,
  getTaskStats,
  getAuditStats,
  getResourceStats
};
