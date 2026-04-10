const { query } = require('../utils/database');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// 获取主题列表
async function getThemes(req, res) {
  try {
    const themes = await query('SELECT * FROM themes ORDER BY name');

    res.json({
      success: true,
      data: themes
    });
  } catch (error) {
    logger.error('获取主题列表失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取主题列表失败'
    });
  }
}

// 获取主题详情
async function getThemeById(req, res) {
  try {
    const { id } = req.params;

    const theme = await query('SELECT * FROM themes WHERE id = ?', [id]);

    if (theme.length === 0) {
      return res.status(404).json({
        success: false,
        error: '主题不存在'
      });
    }

    res.json({
      success: true,
      data: theme[0]
    });
  } catch (error) {
    logger.error('获取主题详情失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取主题详情失败'
    });
  }
}

// 创建自定义主题
async function createCustomTheme(req, res) {
  try {
    const { name, colors, settings } = req.body;

    const sql = 'INSERT INTO themes (name, colors, settings, is_custom) VALUES (?, ?, ?, ?)';
    const result = await query(sql, [name, JSON.stringify(colors || {}), JSON.stringify(settings || {}), true]);

    logger.info(`创建自定义主题：${name}`);

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name,
        colors,
        settings,
        is_custom: true
      }
    });
  } catch (error) {
    logger.error('创建自定义主题失败:', error.message);
    res.status(500).json({
      success: false,
      error: '创建自定义主题失败'
    });
  }
}

// 更新主题
async function updateTheme(req, res) {
  try {
    const { id } = req.params;
    const { name, colors, settings } = req.body;

    const updateFields = [];
    const params = [];

    if (name) {
      updateFields.push('name = ?');
      params.push(name);
    }
    if (colors) {
      updateFields.push('colors = ?');
      params.push(JSON.stringify(colors));
    }
    if (settings) {
      updateFields.push('settings = ?');
      params.push(JSON.stringify(settings));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有要更新的字段'
      });
    }

    params.push(id);
    const sql = `UPDATE themes SET ${updateFields.join(', ')} WHERE id = ?`;
    await query(sql, params);

    logger.info(`更新主题：${id}`);

    res.json({
      success: true,
      message: '主题更新成功'
    });
  } catch (error) {
    logger.error('更新主题失败:', error.message);
    res.status(500).json({
      success: false,
      error: '更新主题失败'
    });
  }
}

// 删除主题
async function deleteTheme(req, res) {
  try {
    const { id } = req.params;

    const theme = await query('SELECT * FROM themes WHERE id = ?', [id]);

    if (theme.length === 0) {
      return res.status(404).json({
        success: false,
        error: '主题不存在'
      });
    }

    if (!theme[0].is_custom) {
      return res.status(400).json({
        success: false,
        error: '系统主题不能删除'
      });
    }

    await query('DELETE FROM themes WHERE id = ?', [id]);

    logger.info(`删除主题：${id}`);

    res.json({
      success: true,
      message: '主题删除成功'
    });
  } catch (error) {
    logger.error('删除主题失败:', error.message);
    res.status(500).json({
      success: false,
      error: '删除主题失败'
    });
  }
}

// 获取用户主题偏好
async function getUserThemePreference(req, res) {
  try {
    const userId = req.user.id;

    const preference = await query(
      'SELECT * FROM user_theme_preferences WHERE user_id = ?',
      [userId]
    );

    if (preference.length === 0) {
      return res.json({
        success: true,
        data: {
          themeId: 'light',
          autoSwitch: true
        }
      });
    }

    res.json({
      success: true,
      data: preference[0]
    });
  } catch (error) {
    logger.error('获取用户主题偏好失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取用户主题偏好失败'
    });
  }
}

// 更新用户主题偏好
async function updateUserThemePreference(req, res) {
  try {
    const userId = req.user.id;
    const { themeId, autoSwitch } = req.body;

    const existing = await query(
      'SELECT * FROM user_theme_preferences WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      await query(
        'UPDATE user_theme_preferences SET theme_id = ?, auto_switch = ? WHERE user_id = ?',
        [themeId, autoSwitch, userId]
      );
    } else {
      await query(
        'INSERT INTO user_theme_preferences (user_id, theme_id, auto_switch) VALUES (?, ?, ?)',
        [userId, themeId, autoSwitch]
      );
    }

    logger.info(`更新用户主题偏好：用户 ${userId}, 主题 ${themeId}`);

    res.json({
      success: true,
      message: '主题偏好更新成功'
    });
  } catch (error) {
    logger.error('更新用户主题偏好失败:', error.message);
    res.status(500).json({
      success: false,
      error: '更新用户主题偏好失败'
    });
  }
}

module.exports = {
  getThemes,
  getThemeById,
  createCustomTheme,
  updateTheme,
  deleteTheme,
  getUserThemePreference,
  updateUserThemePreference
};
