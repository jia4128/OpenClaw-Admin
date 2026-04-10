const request = require('supertest');
const app = require('../../src/index');
const { query } = require('../../src/utils/database');

describe('批量操作 API 测试', () => {
  describe('DELETE /api/batch/:resource', () => {
    it('应该批量删除用户', async () => {
      // 创建测试数据
      await query("INSERT INTO users (name, email, status) VALUES ('Test User 1', 'test1@example.com', 'active')");
      await query("INSERT INTO users (name, email, status) VALUES ('Test User 2', 'test2@example.com', 'active')");

      const users = await query("SELECT id FROM users WHERE email LIKE 'test%@example.com'");
      const ids = users.map(u => u.id);

      const response = await request(app)
        .delete(`/api/batch/users`)
        .send({ ids });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.deleted_count).toBe(2);
    });
  });

  describe('PATCH /api/batch/:resource/status', () => {
    it('应该批量更新用户状态', async () => {
      const response = await request(app)
        .patch('/api/batch/users/status')
        .send({
          ids: ['1'],
          status: 'inactive'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/batch/:resource/export', () => {
    it('应该批量导出数据', async () => {
      const response = await request(app)
        .post('/api/batch/users/export')
        .send({
          ids: ['1'],
          format: 'csv',
          fields: ['id', 'name', 'email']
        });

      expect(response.status).toBe(200);
    });
  });
});

describe('搜索 API 测试', () => {
  describe('GET /api/search/global', () => {
    it('应该执行全局搜索', async () => {
      const response = await request(app)
        .get('/api/search/global?q=admin&page=1&pageSize=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/:resource/filter', () => {
    it('应该执行高级筛选', async () => {
      const response = await request(app)
        .post('/api/users/filter')
        .send({
          filters: [
            { field: 'status', operator: 'eq', value: 'active' }
          ],
          page: 1,
          pageSize: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

describe('统计 API 测试', () => {
  describe('GET /api/stats/overview', () => {
    it('应该获取系统统计概览', async () => {
      const response = await request(app)
        .get('/api/stats/overview');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('tasks');
      expect(response.body.data).toHaveProperty('scenarios');
    });
  });

  describe('GET /api/stats/users', () => {
    it('应该获取用户统计', async () => {
      const response = await request(app)
        .get('/api/stats/users');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/stats/tasks', () => {
    it('应该获取任务统计', async () => {
      const response = await request(app)
        .get('/api/stats/tasks');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

describe('RBAC API 测试', () => {
  describe('GET /api/rbac/permissions', () => {
    it('应该获取权限列表', async () => {
      const response = await request(app)
        .get('/api/rbac/permissions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/rbac/roles', () => {
    it('应该获取角色列表', async () => {
      const response = await request(app)
        .get('/api/rbac/roles');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

describe('主题 API 测试', () => {
  describe('GET /api/themes', () => {
    it('应该获取主题列表', async () => {
      const response = await request(app)
        .get('/api/themes');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
