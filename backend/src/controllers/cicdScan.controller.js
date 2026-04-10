/**
 * CI/CD 扫描控制器
 * 处理 CI/CD 安全扫描相关的 API 接口
 */

const cicdScanService = require('../services/cicdScanService');
const sessionModel = require('../models/sessionModel');

class CICDScanController {
  /**
   * 获取扫描任务列表
   */
  getScans(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { project_name, scan_type, status, limit } = req.query;

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

      const scans = cicdScanService.getScans({
        project_name,
        scan_type,
        status,
        limit: limit ? parseInt(limit) : 50
      });

      res.json({
        success: true,
        data: scans
      });
    } catch (error) {
      console.error('GetScans error:', error);
      res.status(500).json({
        success: false,
        error: '获取扫描任务列表失败'
      });
    }
  }

  /**
   * 获取单个扫描任务详情
   */
  getScan(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { scanId } = req.params;

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

      const scan = cicdScanService.getScan(scanId);

      if (!scan) {
        return res.status(404).json({
          success: false,
          error: '扫描任务不存在'
        });
      }

      res.json({
        success: true,
        data: scan
      });
    } catch (error) {
      console.error('GetScan error:', error);
      res.status(500).json({
        success: false,
        error: '获取扫描任务详情失败'
      });
    }
  }

  /**
   * 创建扫描任务
   */
  createScan(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const scanData = req.body;

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

      if (!scanData.project_name || !scanData.scan_type) {
        return res.status(400).json({
          success: false,
          error: '缺少必填字段：project_name, scan_type'
        });
      }

      const scanId = cicdScanService.createScan({
        ...scanData,
        trigger_by: session.username
      });

      res.status(201).json({
        success: true,
        message: '扫描任务创建成功',
        data: { scan_id: scanId }
      });
    } catch (error) {
      console.error('CreateScan error:', error);
      res.status(500).json({
        success: false,
        error: '创建扫描任务失败'
      });
    }
  }

  /**
   * 执行 SAST 扫描
   */
  async runSAST(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const config = req.body;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session || session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '没有权限执行 SAST 扫描'
        });
      }

      if (!config.project_name) {
        return res.status(400).json({
          success: false,
          error: '缺少必填字段：project_name'
        });
      }

      const scanId = cicdScanService.createScan({
        project_name: config.project_name,
        scan_type: 'sast',
        trigger_by: session.username,
        trigger_type: 'manual'
      });

      // 异步执行扫描
      cicdScanService.runSAST(scanId, config).then(result => {
        this.logAudit(session.user_id, session.username, 'sast_scan_completed', `/api/cicd/scans/${scanId}`, req, result.success ? 'success' : 'failed');
      });

      res.json({
        success: true,
        message: 'SAST 扫描任务已启动',
        data: { scan_id: scanId }
      });
    } catch (error) {
      console.error('RunSAST error:', error);
      res.status(500).json({
        success: false,
        error: '启动 SAST 扫描失败'
      });
    }
  }

  /**
   * 执行 DAST 扫描
   */
  async runDAST(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const config = req.body;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session || session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '没有权限执行 DAST 扫描'
        });
      }

      if (!config.project_name || !config.target_url) {
        return res.status(400).json({
          success: false,
          error: '缺少必填字段：project_name, target_url'
        });
      }

      const scanId = cicdScanService.createScan({
        project_name: config.project_name,
        scan_type: 'dast',
        trigger_by: session.username,
        trigger_type: 'manual'
      });

      // 异步执行扫描
      cicdScanService.runDAST(scanId, config).then(result => {
        this.logAudit(session.user_id, session.username, 'dast_scan_completed', `/api/cicd/scans/${scanId}`, req, result.success ? 'success' : 'failed');
      });

      res.json({
        success: true,
        message: 'DAST 扫描任务已启动',
        data: { scan_id: scanId }
      });
    } catch (error) {
      console.error('RunDAST error:', error);
      res.status(500).json({
        success: false,
        error: '启动 DAST 扫描失败'
      });
    }
  }

  /**
   * 执行依赖扫描
   */
  async runDependencyScan(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const config = req.body;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session || session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '没有权限执行依赖扫描'
        });
      }

      if (!config.project_name) {
        return res.status(400).json({
          success: false,
          error: '缺少必填字段：project_name'
        });
      }

      const scanId = cicdScanService.createScan({
        project_name: config.project_name,
        scan_type: 'dependency',
        trigger_by: session.username,
        trigger_type: 'manual'
      });

      // 异步执行扫描
      cicdScanService.runDependencyScan(scanId, config).then(result => {
        this.logAudit(session.user_id, session.username, 'dependency_scan_completed', `/api/cicd/scans/${scanId}`, req, result.success ? 'success' : 'failed');
      });

      res.json({
        success: true,
        message: '依赖扫描任务已启动',
        data: { scan_id: scanId }
      });
    } catch (error) {
      console.error('RunDependencyScan error:', error);
      res.status(500).json({
        success: false,
        error: '启动依赖扫描失败'
      });
    }
  }

  /**
   * 执行密钥检测
   */
  async runSecretScan(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const config = req.body;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session || session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '没有权限执行密钥检测'
        });
      }

      if (!config.project_name) {
        return res.status(400).json({
          success: false,
          error: '缺少必填字段：project_name'
        });
      }

      const scanId = cicdScanService.createScan({
        project_name: config.project_name,
        scan_type: 'secret',
        trigger_by: session.username,
        trigger_type: 'manual'
      });

      // 异步执行扫描
      cicdScanService.runSecretScan(scanId, config).then(result => {
        this.logAudit(session.user_id, session.username, 'secret_scan_completed', `/api/cicd/scans/${scanId}`, req, result.success ? 'success' : 'failed');
      });

      res.json({
        success: true,
        message: '密钥检测任务已启动',
        data: { scan_id: scanId }
      });
    } catch (error) {
      console.error('RunSecretScan error:', error);
      res.status(500).json({
        success: false,
        error: '启动密钥检测失败'
      });
    }
  }

  /**
   * 获取扫描结果
   */
  getScanResults(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { scanId } = req.params;
      const { severity, limit } = req.query;

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

      const results = cicdScanService.getScanResults(scanId, {
        severity,
        limit: limit ? parseInt(limit) : 100
      });

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('GetScanResults error:', error);
      res.status(500).json({
        success: false,
        error: '获取扫描结果失败'
      });
    }
  }

  /**
   * 获取扫描统计信息
   */
  getScanStats(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { start_date, end_date } = req.query;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: '未授权'
        });
      }

      const session = sessionModel.findByToken(token);
      if (!session || session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '没有权限访问扫描统计信息'
        });
      }

      const stats = cicdScanService.getScanStats(
        start_date ? parseInt(start_date) : undefined,
        end_date ? parseInt(end_date) : undefined
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('GetScanStats error:', error);
      res.status(500).json({
        success: false,
        error: '获取扫描统计信息失败'
      });
    }
  }

  /**
   * 记录审计日志
   */
  logAudit(userId, username, action, resource, req, status) {
    try {
      const logId = require('crypto').randomUUID();
      const db = require('../models/database');
      const stmt = db.prepare(`
        INSERT INTO audit_logs (id, user_id, username, action, resource, ip_address, user_agent, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        logId,
        userId,
        username,
        action,
        resource,
        req.ip,
        req.get('user-agent'),
        status,
        Date.now()
      );
    } catch (e) {
      console.error('Failed to log audit:', e);
    }
  }
}

module.exports = new CICDScanController();
