/**
 * 日志脱敏中间件
 * 用于请求和响应日志的脱敏处理
 */

const { mask, maskObject } = require('../utils/sensitiveData');

/**
 * 请求日志脱敏中间件
 */
function requestLogger(logger) {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // 记录请求信息（脱敏处理）
    const logData = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    };

    // 脱敏请求体
    if (req.body && Object.keys(req.body).length > 0) {
      logData.body = maskObject(req.body);
    }

    // 脱敏查询参数
    if (req.query && Object.keys(req.query).length > 0) {
      logData.query = maskObject(req.query);
    }

    logger.info('Request received', logData);

    // 响应结束时的处理
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      logger.info('Request completed', {
        ...logData,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
    });

    next();
  };
}

/**
 * 错误日志脱敏中间件
 */
function errorLogger(logger) {
  return (err, req, res, next) => {
    const logData = {
      error: err.message,
      stack: mask(err.stack || ''),
      url: req.url,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    };

    // 脱敏请求体
    if (req.body) {
      logData.body = maskObject(req.body);
    }

    logger.error('Error occurred', logData);
    next(err);
  };
}

/**
 * 响应数据脱敏装饰器
 * 用于对响应数据进行脱敏处理
 */
function maskResponse(res) {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    const maskedData = maskObject(data);
    return originalJson(maskedData);
  };

  return res;
}

module.exports = {
  requestLogger,
  errorLogger,
  maskResponse
};
