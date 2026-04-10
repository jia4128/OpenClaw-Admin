/**
 * 数据库连接配置
 * 使用 sql.js 进行 SQLite 数据库操作（纯 JavaScript 实现，无需编译）
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// 数据库文件路径
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/wizard.db');

// 确保数据目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

/**
 * 初始化数据库
 */
async function initDatabase() {
  const SQL = await initSqlJs();
  
  // 尝试加载现有数据库
  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
  } catch (e) {
    db = new SQL.Database();
  }

  // 创建表结构
  createTables();
  
  // 保存数据库
  saveDatabase();
  
  console.log('Database initialized successfully');
  return db;
}

/**
 * 创建数据库表
 */
function createTables() {
  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT    PRIMARY KEY,
      username      TEXT    UNIQUE NOT NULL,
      password_hash TEXT    NOT NULL,
      display_name  TEXT,
      role          TEXT    DEFAULT 'viewer',
      status        TEXT    DEFAULT 'active',
      email         TEXT,
      avatar        TEXT,
      created_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
      updated_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
      last_login_at INTEGER
    )
  `);

  // 会话表（用于会话持久化）
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id            TEXT    PRIMARY KEY,
      user_id       TEXT    NOT NULL,
      token         TEXT    UNIQUE NOT NULL,
      ip_address    TEXT,
      user_agent    TEXT,
      created_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
      expires_at    INTEGER NOT NULL,
      last_active   INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
      is_valid      INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 审计日志表
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id             TEXT    PRIMARY KEY,
      user_id        TEXT,
      username       TEXT,
      action         TEXT    NOT NULL,
      resource       TEXT,
      resource_id    TEXT,
      details        TEXT    DEFAULT '{}',
      ip_address     TEXT,
      user_agent     TEXT,
      status         TEXT    DEFAULT 'success',
      error_message  TEXT,
      created_at     INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
    )
  `);

  // 双因素认证配置表
  db.run(`
    CREATE TABLE IF NOT EXISTS two_factor_auth (
      id            TEXT    PRIMARY KEY,
      user_id       TEXT    UNIQUE NOT NULL,
      secret        TEXT    NOT NULL,
      enabled       INTEGER DEFAULT 0,
      backup_codes  TEXT    DEFAULT '[]',
      created_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
      updated_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // WAF 规则表
  db.run(`
    CREATE TABLE IF NOT EXISTS waf_rules (
      id            TEXT    PRIMARY KEY,
      name          TEXT    NOT NULL,
      description   TEXT,
      rule_type     TEXT    NOT NULL,
      condition     TEXT    NOT NULL,
      action        TEXT    NOT NULL,
      priority      INTEGER DEFAULT 0,
      enabled       INTEGER DEFAULT 1,
      created_by    TEXT,
      created_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
      updated_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
    )
  `);

  // WAF 拦截日志表
  db.run(`
    CREATE TABLE IF NOT EXISTS waf_logs (
      id            TEXT    PRIMARY KEY,
      rule_id       TEXT,
      ip_address    TEXT    NOT NULL,
      method        TEXT    NOT NULL,
      url           TEXT    NOT NULL,
      user_agent    TEXT,
      matched_pattern TEXT,
      action        TEXT    NOT NULL,
      created_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
      FOREIGN KEY (rule_id) REFERENCES waf_rules(id) ON DELETE SET NULL
    )
  `);

  // CI/CD扫描任务表
  db.run(`
    CREATE TABLE IF NOT EXISTS cicd_scans (
      id            TEXT    PRIMARY KEY,
      project_name  TEXT    NOT NULL,
      scan_type     TEXT    NOT NULL,
      status        TEXT    NOT NULL,
      trigger_by    TEXT,
      trigger_type  TEXT,
      started_at    INTEGER,
      completed_at  INTEGER,
      result_summary TEXT    DEFAULT '{}',
      issues_count  INTEGER DEFAULT 0,
      created_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
    )
  `);

  // CI/CD扫描结果表
  db.run(`
    CREATE TABLE IF NOT EXISTS cicd_scan_results (
      id            TEXT    PRIMARY KEY,
      scan_id       TEXT    NOT NULL,
      severity      TEXT    NOT NULL,
      category      TEXT,
      title         TEXT    NOT NULL,
      description   TEXT,
      location      TEXT,
      remediation   TEXT,
      created_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
      FOREIGN KEY (scan_id) REFERENCES cicd_scans(id) ON DELETE CASCADE
    )
  `);

  // 环境变量配置表
  db.run(`
    CREATE TABLE IF NOT EXISTS env_configs (
      id            TEXT    PRIMARY KEY,
      key           TEXT    UNIQUE NOT NULL,
      value_hash    TEXT,
      value_encrypted TEXT,
      is_sensitive  INTEGER DEFAULT 0,
      description   TEXT,
      created_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
      updated_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
    )
  `);
}

/**
 * 保存数据库到文件
 */
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

/**
 * 执行查询
 */
function query(sql, params = []) {
  if (!db) {
    throw new Error('Database not initialized');
  }
  
  try {
    const result = db.exec(sql);
    return result;
  } catch (e) {
    console.error('Query error:', e);
    throw e;
  }
}

/**
 * 执行语句
 */
function run(sql, params = []) {
  if (!db) {
    throw new Error('Database not initialized');
  }
  
  try {
    db.run(sql, params);
    saveDatabase();
    return { changes: db.getRowsModified() };
  } catch (e) {
    console.error('Run error:', e);
    throw e;
  }
}

/**
 * 准备语句（简化版）
 */
function prepare(sql) {
  if (!db) {
    throw new Error('Database not initialized');
  }
  
  return {
    run: function(params = []) {
      db.run(sql, params);
      saveDatabase();
      return { changes: db.getRowsModified() };
    },
    all: function(params = []) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    },
    get: function(params = []) {
      const results = this.all(params);
      return results.length > 0 ? results[0] : null;
    }
  };
}

// 异步初始化
let initPromise = null;

function getDb() {
  if (!initPromise) {
    initPromise = initDatabase();
  }
  return initPromise;
}

module.exports = {
  getDb,
  query,
  run,
  prepare,
  saveDatabase
};
