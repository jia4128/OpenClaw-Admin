/**
 * 日志脱敏工具
 * 用于敏感信息的脱敏处理
 */

const crypto = require('crypto');

// 敏感信息正则表达式
const SENSITIVE_PATTERNS = {
  // 密码
  password: /\b(password|passwd|pwd)\s*[:=]\s*["']?[^"'\s,}]+["']?/gi,
  // API Key
  apiKey: /\b(api[_-]?key|apikey)\s*[:=]\s*["']?[^"'\s,}]+["']?/gi,
  // Token
  token: /\b(token|auth[_-]?token|access[_-]?token)\s*[:=]\s*["']?[^"'\s,}]+["']?/gi,
  // 手机号
  phone: /\b1[3-9]\d{9}\b/g,
  // 邮箱
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // IP 地址
  ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  // 银行卡号
  card: /\b\d{15,19}\b/g,
  // 身份证号
  idCard: /\b\d{17}[\dXx]\b/g,
  // Secret
  secret: /\b(secret|secret[_-]?key)\s*[:=]\s*["']?[^"'\s,}]+["']?/gi
};

// 脱敏掩码
const MASKS = {
  password: 'password: [REDACTED]',
  apiKey: 'api_key: [REDACTED]',
  token: 'token: [REDACTED]',
  phone: (match) => match.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
  email: (match) => match.replace(/^(.)(.*)(@.*)$/, '$1***$3'),
  ip: (match) => match.replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.*'),
  card: (match) => match.replace(/(\d{4})\d{8,10}(\d{4})/, '$1**********$2'),
  idCard: (match) => match.replace(/(\d{6})\d{8,10}(\d{2}[Xx\d])/, '$1**********$2'),
  secret: 'secret: [REDACTED]'
};

/**
 * 脱敏字符串
 * @param {string} input - 需要脱敏的字符串
 * @returns {string} - 脱敏后的字符串
 */
function mask(input) {
  if (!input || typeof input !== 'string') {
    return input;
  }

  let result = input;

  // 遍历所有敏感模式
  for (const [key, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
    const maskFunc = MASKS[key];
    if (maskFunc) {
      result = result.replace(pattern, (match) => {
        return typeof maskFunc === 'function' ? maskFunc(match) : maskFunc;
      });
    }
  }

  return result;
}

/**
 * 脱敏对象（递归处理）
 * @param {any} obj - 需要脱敏的对象
 * @returns {any} - 脱敏后的对象
 */
function maskObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return mask(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskObject(item));
  }

  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      // 检查键名是否包含敏感词
      const isSensitiveKey = /password|secret|token|api[_-]?key|auth[_-]?token/i.test(key);
      if (isSensitiveKey) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = maskObject(value);
      }
    }
    return result;
  }

  return obj;
}

/**
 * 生成敏感数据的哈希值
 * @param {string} data - 原始数据
 * @param {string} salt - 盐值
 * @returns {string} - 哈希值
 */
function hash(data, salt = process.env.HASH_SALT || 'default_salt') {
  if (!data) return null;
  
  const hash = crypto.createHmac('sha256', salt);
  hash.update(data);
  return hash.digest('hex');
}

/**
 * 比较哈希值
 * @param {string} data - 原始数据
 * @param {string} hashValue - 待比较的哈希值
 * @param {string} salt - 盐值
 * @returns {boolean} - 是否匹配
 */
function compareHash(data, hashValue, salt = process.env.HASH_SALT || 'default_salt') {
  if (!data || !hashValue) return false;
  return hash(data, salt) === hashValue;
}

module.exports = {
  mask,
  maskObject,
  hash,
  compareHash,
  SENSITIVE_PATTERNS
};
