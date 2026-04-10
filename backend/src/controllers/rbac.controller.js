const { query } = require('../utils/database');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// 获取权限列表
async function getPermissions(req, res) {
  try {
    const permissions = await query('SELECT * FROM permissions ORDER BY name');

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    logger.error('获取权限列表失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取权限列表失败'
    });
  }
}

// 创建权限
async function createPermission(req, res) {
  try {
    const { name, resource, action, description } = req.body;

    const sql = 'INSERT INTO permissions (name, resource, action, description) VALUES (?, ?, ?, ?)';
    const result = await query(sql, [name, resource, action, description || '']);

    logger.info(`创建权限：${name}`);

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name,
        resource,
        action,
        description
      }
    });
  } catch (error) {
    logger.error('创建权限失败:', error.message);
    res.status(500).json({
      success: false,
      error: '创建权限失败'
    });
  }
}

// 获取角色列表
async function getRoles(req, res) {
  try {
    const roles = await query(`
      SELECT r.*, GROUP_CONCAT(p.name) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      GROUP BY r.id
      ORDER BY r.name
    `);

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    logger.error('获取角色列表失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取角色列表失败'
    });
  }
}

// 创建角色
async function createRole(req, res) {
  try {
    const { name, description } = req.body;

    const sql = 'INSERT INTO roles (name, description) VALUES (?, ?)';
    const result = await query(sql, [name, description || '']);

    logger.info(`创建角色：${name}`);

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name,
        description
      }
    });
  } catch (error) {
    logger.error('创建角色失败:', error.message);
    res.status(500).json({
      success: false,
      error: '创建角色失败'
    });
  }
}

// 获取角色详情
async function getRoleById(req, res) {
  try {
    const { id } = req.params;

    const role = await query('SELECT * FROM roles WHERE id = ?', [id]);

    if (role.length === 0) {
      return res.status(404).json({
        success: false,
        error: '角色不存在'
      });
    }

    const permissions = await query(`
      SELECT p.* FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `, [id]);

    res.json({
      success: true,
      data: {
        ...role[0],
        permissions
      }
    });
  } catch (error) {
    logger.error('获取角色详情失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取角色详情失败'
    });
  }
}

// 更新角色
async function updateRole(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const sql = 'UPDATE roles SET name = ?, description = ? WHERE id = ?';
    await query(sql, [name, description, id]);

    logger.info(`更新角色：${id}`);

    res.json({
      success: true,
      message: '角色更新成功'
    });
  } catch (error) {
    logger.error('更新角色失败:', error.message);
    res.status(500).json({
      success: false,
      error: '更新角色失败'
    });
  }
}

// 删除角色
async function deleteRole(req, res) {
  try {
    const { id } = req.params;

    await query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
    await query('DELETE FROM roles WHERE id = ?', [id]);

    logger.info(`删除角色：${id}`);

    res.json({
      success: true,
      message: '角色删除成功'
    });
  } catch (error) {
    logger.error('删除角色失败:', error.message);
    res.status(500).json({
      success: false,
      error: '删除角色失败'
    });
  }
}

// 分配角色权限
async function assignRolePermissions(req, res) {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;

    await query('DELETE FROM role_permissions WHERE role_id = ?', [id]);

    const values = permissionIds.map(pid => [id, pid]);
    const insertSql = 'INSERT INTO role_permissions (role_id, permission_id) VALUES ?';
    await query(insertSql, [values]);

    logger.info(`分配角色权限：角色 ${id}, 权限 ${permissionIds.join(', ')}`);

    res.json({
      success: true,
      message: '权限分配成功'
    });
  } catch (error) {
    logger.error('分配角色权限失败:', error.message);
    res.status(500).json({
      success: false,
      error: '分配角色权限失败'
    });
  }
}

// 获取用户权限
async function getUserPermissions(req, res) {
  try {
    const { userId } = req.params;

    const permissions = await query(`
      SELECT DISTINCT p.* FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `, [userId]);

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    logger.error('获取用户权限失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取用户权限失败'
    });
  }
}

// 权限检查
async function checkPermission(req, res) {
  try {
    const { userId, resource, action } = req.body;

    const hasPermission = await query(`
      SELECT COUNT(*) as count FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ? AND p.resource = ? AND p.action = ?
    `, [userId, resource, action]);

    res.json({
      success: true,
      data: {
        hasPermission: hasPermission[0].count > 0
      }
    });
  } catch (error) {
    logger.error('权限检查失败:', error.message);
    res.status(500).json({
      success: false,
      error: '权限检查失败'
    });
  }
}

module.exports = {
  getPermissions,
  createPermission,
  getRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,
  assignRolePermissions,
  getUserPermissions,
  checkPermission
};
