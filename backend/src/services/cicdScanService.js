/**
 * CI/CD 安全扫描服务
 * 集成 SAST、DAST、依赖扫描、密钥检测等安全扫描功能
 */

const db = require('../models/database');
const crypto = require('crypto');
const { spawn } = require('child_process');

class CICDScanService {
  /**
   * 创建新的扫描任务
   * @param {object} scanData - 扫描数据
   * @returns {string} - 扫描任务 ID
   */
  createScan(scanData) {
    const scanId = crypto.randomUUID();
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO cicd_scans (id, project_name, scan_type, status, trigger_by, trigger_type, created_at)
      VALUES (?, ?, ?, 'pending', ?, ?, ?)
    `);

    stmt.run(
      scanId,
      scanData.project_name,
      scanData.scan_type,
      scanData.trigger_by || 'system',
      scanData.trigger_type || 'manual',
      now
    );

    return scanId;
  }

  /**
   * 获取扫描任务列表
   * @param {object} options - 查询选项
   * @returns {Array} - 扫描任务列表
   */
  getScans(options = {}) {
    const { project_name, scan_type, status, limit = 50 } = options;
    
    let sql = 'SELECT * FROM cicd_scans WHERE 1=1';
    const params = [];

    if (project_name) {
      sql += ' AND project_name = ?';
      params.push(project_name);
    }

    if (scan_type) {
      sql += ' AND scan_type = ?';
      params.push(scan_type);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }

  /**
   * 获取单个扫描任务详情
   * @param {string} scanId - 扫描 ID
   * @returns {object|null} - 扫描任务详情
   */
  getScan(scanId) {
    const stmt = db.prepare('SELECT * FROM cicd_scans WHERE id = ?');
    return stmt.get(scanId);
  }

  /**
   * 更新扫描任务状态
   * @param {string} scanId - 扫描 ID
   * @param {object} updateData - 更新数据
   * @returns {boolean} - 是否成功
   */
  updateScan(scanId, updateData) {
    const fields = [];
    const params = [];

    if (updateData.status) {
      fields.push('status = ?');
      params.push(updateData.status);
    }

    if (updateData.started_at !== undefined) {
      fields.push('started_at = ?');
      params.push(updateData.started_at);
    }

    if (updateData.completed_at !== undefined) {
      fields.push('completed_at = ?');
      params.push(updateData.completed_at);
    }

    if (updateData.result_summary) {
      fields.push('result_summary = ?');
      params.push(JSON.stringify(updateData.result_summary));
    }

    if (updateData.issues_count !== undefined) {
      fields.push('issues_count = ?');
      params.push(updateData.issues_count);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = ?');
    params.push(Date.now());
    params.push(scanId);

    const sql = `UPDATE cicd_scans SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);

    return result.changes > 0;
  }

  /**
   * 添加扫描结果
   * @param {string} scanId - 扫描 ID
   * @param {object} resultData - 结果数据
   * @returns {string} - 结果 ID
   */
  addScanResult(scanId, resultData) {
    const resultId = crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT INTO cicd_scan_results (id, scan_id, severity, category, title, description, location, remediation, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      resultId,
      scanId,
      resultData.severity,
      resultData.category || '',
      resultData.title,
      resultData.description || '',
      resultData.location || '',
      resultData.remediation || '',
      Date.now()
    );

    return resultId;
  }

  /**
   * 获取扫描结果列表
   * @param {string} scanId - 扫描 ID
   * @param {object} options - 查询选项
   * @returns {Array} - 结果列表
   */
  getScanResults(scanId, options = {}) {
    const { severity, limit = 100 } = options;
    
    let sql = 'SELECT * FROM cicd_scan_results WHERE scan_id = ?';
    const params = [scanId];

    if (severity) {
      sql += ' AND severity = ?';
      params.push(severity);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }

  /**
   * 执行 SAST (静态应用安全测试) 扫描
   * @param {string} scanId - 扫描 ID
   * @param {object} config - 扫描配置
   */
  async runSAST(scanId, config) {
    this.updateScan(scanId, { status: 'running', started_at: Date.now() });

    try {
      // 这里调用实际的 SAST 工具，如 Semgrep、Bandit 等
      // 示例：使用 Semgrep 进行扫描
      const result = await this.executeScanTool('semgrep', [
        'scan',
        '--config', config.config_path || 'auto',
        '--json',
        config.target_path || '.'
      ]);

      const issues = this.parseSASTResult(result);
      
      // 保存结果
      for (const issue of issues) {
        this.addScanResult(scanId, {
          severity: issue.severity,
          category: issue.category,
          title: issue.title,
          description: issue.description,
          location: issue.location,
          remediation: issue.remediation
        });
      }

      this.updateScan(scanId, {
        status: 'completed',
        completed_at: Date.now(),
        issues_count: issues.length,
        result_summary: JSON.stringify({ total: issues.length, by_severity: this.countBySeverity(issues) })
      });

      return { success: true, issuesCount: issues.length };
    } catch (error) {
      this.updateScan(scanId, {
        status: 'failed',
        completed_at: Date.now(),
        result_summary: JSON.stringify({ error: error.message })
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行 DAST (动态应用安全测试) 扫描
   * @param {string} scanId - 扫描 ID
   * @param {object} config - 扫描配置
   */
  async runDAST(scanId, config) {
    this.updateScan(scanId, { status: 'running', started_at: Date.now() });

    try {
      // 这里调用实际的 DAST 工具，如 OWASP ZAP、Burp Suite 等
      // 示例：使用 OWASP ZAP
      const result = await this.executeScanTool('zap-baseline.py', [
        '-t', config.target_url,
        '-r', '/tmp/zap_report.html'
      ]);

      const issues = this.parseDASTResult(result);

      for (const issue of issues) {
        this.addScanResult(scanId, {
          severity: issue.severity,
          category: issue.category,
          title: issue.title,
          description: issue.description,
          location: issue.location,
          remediation: issue.remediation
        });
      }

      this.updateScan(scanId, {
        status: 'completed',
        completed_at: Date.now(),
        issues_count: issues.length,
        result_summary: JSON.stringify({ total: issues.length, by_severity: this.countBySeverity(issues) })
      });

      return { success: true, issuesCount: issues.length };
    } catch (error) {
      this.updateScan(scanId, {
        status: 'failed',
        completed_at: Date.now(),
        result_summary: JSON.stringify({ error: error.message })
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行依赖扫描
   * @param {string} scanId - 扫描 ID
   * @param {object} config - 扫描配置
   */
  async runDependencyScan(scanId, config) {
    this.updateScan(scanId, { status: 'running', started_at: Date.now() });

    try {
      // 使用 npm audit 或 yarn audit
      const packageManager = config.package_manager || 'npm';
      const result = await this.executeScanTool(packageManager, ['audit', '--json']);

      const issues = this.parseDependencyResult(result);

      for (const issue of issues) {
        this.addScanResult(scanId, {
          severity: issue.severity,
          category: 'dependency',
          title: issue.title,
          description: issue.description,
          location: issue.location,
          remediation: issue.remediation
        });
      }

      this.updateScan(scanId, {
        status: 'completed',
        completed_at: Date.now(),
        issues_count: issues.length,
        result_summary: JSON.stringify({ total: issues.length, by_severity: this.countBySeverity(issues) })
      });

      return { success: true, issuesCount: issues.length };
    } catch (error) {
      this.updateScan(scanId, {
        status: 'failed',
        completed_at: Date.now(),
        result_summary: JSON.stringify({ error: error.message })
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行密钥检测
   * @param {string} scanId - 扫描 ID
   * @param {object} config - 扫描配置
   */
  async runSecretScan(scanId, config) {
    this.updateScan(scanId, { status: 'running', started_at: Date.now() });

    try {
      // 使用 gitleaks 或 truffleHog
      const result = await this.executeScanTool('gitleaks', [
        'detect',
        '--source', config.target_path || '.',
        '--report-path', '/tmp/gitleaks-report.json'
      ]);

      const issues = this.parseSecretResult(result);

      for (const issue of issues) {
        this.addScanResult(scanId, {
          severity: 'critical',
          category: 'secret',
          title: issue.title,
          description: issue.description,
          location: issue.location,
          remediation: '立即撤销泄露的密钥并轮换所有相关凭证'
        });
      }

      this.updateScan(scanId, {
        status: 'completed',
        completed_at: Date.now(),
        issues_count: issues.length,
        result_summary: JSON.stringify({ total: issues.length, by_severity: this.countBySeverity(issues) })
      });

      return { success: true, issuesCount: issues.length };
    } catch (error) {
      this.updateScan(scanId, {
        status: 'failed',
        completed_at: Date.now(),
        result_summary: JSON.stringify({ error: error.message })
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行扫描工具
   */
  executeScanTool(tool, args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(tool, args);
      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        error += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 || output) {
          resolve(output);
        } else {
          reject(new Error(error || `Tool exited with code ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }

  /**
   * 解析 SAST 结果
   */
  parseSASTResult(result) {
    try {
      const json = JSON.parse(result);
      return (json.results || []).map(r => ({
        severity: r.sverity || 'medium',
        category: r.rule_id || 'sast',
        title: r.check_id,
        description: r.extra?.message || '',
        location: `${r.extra?.location?.path}:${r.extra?.location?.line}`,
        remediation: r.extra?.metadata?.fix_recommendation || ''
      }));
    } catch {
      return [];
    }
  }

  /**
   * 解析 DAST 结果
   */
  parseDASTResult(result) {
    // 简化实现，实际应该解析 ZAP 报告
    return [];
  }

  /**
   * 解析依赖扫描结果
   */
  parseDependencyResult(result) {
    try {
      const json = JSON.parse(result);
      const issues = [];
      
      for (const [vulnId, vuln] of Object.entries(json.vulnerabilities || {})) {
        issues.push({
          severity: vuln.severity || 'medium',
          title: vuln.title || vulnId,
          description: vuln.description || '',
          location: vuln.module_name || '',
          remediation: vuln.resolution || '升级依赖版本'
        });
      }

      return issues;
    } catch {
      return [];
    }
  }

  /**
   * 解析密钥检测结果
   */
  parseSecretResult(result) {
    try {
      const json = JSON.parse(result);
      return (json.results || []).map(r => ({
        title: r.rule_id || 'Secret Detected',
        description: `检测到可能的密钥泄露：${r.match}`,
        location: `${r.start_file}:${r.start_line}`
      }));
    } catch {
      return [];
    }
  }

  /**
   * 按严重程度统计问题数量
   */
  countBySeverity(issues) {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const issue of issues) {
      const sev = (issue.severity || 'medium').toLowerCase();
      if (counts[sev] !== undefined) {
        counts[sev]++;
      }
    }
    return counts;
  }

  /**
   * 获取扫描统计信息
   */
  getScanStats(startDate, endDate) {
    let sql = `
      SELECT 
        scan_type,
        status,
        COUNT(*) as count,
        SUM(issues_count) as total_issues
      FROM cicd_scans
      WHERE created_at > ?
      GROUP BY scan_type, status
    `;
    const params = [startDate || Date.now() - 86400000];

    if (endDate) {
      sql += ' AND created_at < ?';
      params.push(endDate);
    }

    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }
}

module.exports = new CICDScanService();
