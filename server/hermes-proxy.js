import { Router } from 'express'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ENV_FILE_PATH = path.join(__dirname, '..', '.env')

const router = Router()

// 认证中间件（由外部设置）
let authMiddleware = null

// 设置认证中间件
export function setAuthMiddleware(middleware) {
  authMiddleware = middleware
  console.log('[Hermes] Auth middleware configured')
}

// 应用认证中间件的路由前缀列表
// 注意：/api/hermes/api-key 不需要认证（设置 API Key 的接口）
const AUTH_REQUIRED_PREFIXES = [
  '/api/hermes/test-connection',
  '/api/hermes/status',
  '/api/hermes/sessions',
  '/api/hermes/config',
  '/api/hermes/env',
  '/api/hermes/logs',
  '/api/hermes/cron',
  '/api/hermes/skills',
  '/api/hermes/tools',
  '/api/hermes/analytics',
  '/api/hermes/v1/',
  '/api/hermes/health',
]

// 不需要认证的特定路由
const AUTH_EXEMPT_ROUTES = [
  '/api/hermes/connect',      // GET 获取配置 / POST 设置配置
  '/api/hermes/api-key',      // POST 设置 API Key
]

// 检查路由是否需要认证
function requiresAuth(path, method) {
  // 检查是否在豁免列表中
  if (AUTH_EXEMPT_ROUTES.some(route => path === route)) {
    return false
  }
  return AUTH_REQUIRED_PREFIXES.some(prefix => path.startsWith(prefix))
}

// 认证中间件包装器 - 使用 HERMES_API_KEY 认证
function authWrapper(req, res, next) {
  if (!requiresAuth(req.path, req.method)) {
    return next()
  }

  // 使用 HERMES_API_KEY 进行认证
  const serverApiKey = hermesConfig.apiKey
  if (!serverApiKey) {
    // 没有配置 API Key，允许访问（向后兼容）
    return next()
  }

  // 检查请求中的 Authorization 头
  const clientAuth = req.headers.authorization
  const bearerMatch = clientAuth ? clientAuth.match(/^Bearer\s+(.+)$/i) : null
  const clientToken = bearerMatch ? bearerMatch[1].trim() : null

  // 如果客户端提供了正确的 API Key，或者没有提供 API Key（代理会使用服务器的）
  // 都允许访问。代理服务器会在 buildProxyHeaders 中处理认证。
  if (!clientToken || clientToken === serverApiKey) {
    return next()
  }

  // 客户端提供了错误的 API Key
  res.status(401).json({ error: 'Unauthorized', message: 'Invalid Hermes API Key' })
}

// Hermes 连接配置（内存存储）
let hermesConfig = {
  webUrl: '',
  apiUrl: '',
  apiKey: '',
}

// Dashboard 会话 Token 缓存
let dashboardToken = null
let dashboardTokenExpiry = 0

// 从 Dashboard HTML 页面获取临时会话 Token
async function fetchDashboardToken(webUrl) {
  // 检查缓存是否有效（5分钟有效期）
  if (dashboardToken && Date.now() < dashboardTokenExpiry) {
    return dashboardToken
  }
  
  return new Promise((resolve, reject) => {
    const targetUrl = new URL('/', webUrl)
    console.log('[Hermes] Fetching dashboard token from:', targetUrl.toString())
    
    const req = http.request(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port,
        path: '/',
        method: 'GET',
        timeout: 5000,
      },
      (res) => {
        let html = ''
        res.on('data', (chunk) => (html += chunk))
        res.on('end', () => {
          // 从 HTML 中提取 Token: window.__HERMES_SESSION_TOKEN__="xxx"
          const match = html.match(/window\.__HERMES_SESSION_TOKEN__="([^"]+)"/)
          if (match) {
            dashboardToken = match[1]
            dashboardTokenExpiry = Date.now() + 5 * 60 * 1000 // 5分钟有效期
            console.log('[Hermes] Dashboard token obtained:', dashboardToken.substring(0, 10) + '...')
            resolve(dashboardToken)
          } else {
            // 检查是否有其他格式的 Token
            const altMatch = html.match(/HERMES_SESSION_TOKEN[^>]*>([^<]+)</)
            if (altMatch) {
              dashboardToken = altMatch[1]
              dashboardTokenExpiry = Date.now() + 5 * 60 * 1000
              console.log('[Hermes] Dashboard token obtained (alt format):', dashboardToken.substring(0, 10) + '...')
              resolve(dashboardToken)
            } else {
              // Token 可能不存在（Dashboard 未启用认证）
              console.log('[Hermes] Dashboard token not found in HTML (may not be required)')
              reject(new Error('Dashboard token not found in HTML'))
            }
          }
        })
      },
    )
    req.on('error', (err) => {
      console.error('[Hermes] Failed to fetch dashboard token:', err.message)
      reject(err)
    })
    req.on('timeout', () => {
      console.error('[Hermes] Dashboard token fetch timeout')
      req.destroy()
      reject(new Error('Timeout'))
    })
    req.end()
  })
}

// 读取 .env 文件
function readEnvFile() {
  try {
    if (!fs.existsSync(ENV_FILE_PATH)) {
      console.log('[Hermes] .env file not found, creating from .env.example')
      const examplePath = path.join(__dirname, '..', '.env.example')
      if (fs.existsSync(examplePath)) {
        fs.copyFileSync(examplePath, ENV_FILE_PATH)
      } else {
        return {}
      }
    }
    const content = fs.readFileSync(ENV_FILE_PATH, 'utf-8')
    const env = {}
    content.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim()
        let value = trimmed.substring(eqIndex + 1).trim()
        // 移除引号
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        env[key] = value
      }
    })
    return env
  } catch (err) {
    console.error('[Hermes] Failed to read .env file:', err.message)
    return {}
  }
}

// 写入 .env 文件
function writeEnvFile(env) {
  try {
    const lines = []
    // 读取现有文件以保留注释和顺序
    let existingContent = ''
    const existingKeys = new Set()
    
    if (fs.existsSync(ENV_FILE_PATH)) {
      existingContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8')
      existingContent.split('\n').forEach(line => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) {
          lines.push(line)
          return
        }
        const eqIndex = trimmed.indexOf('=')
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim()
          existingKeys.add(key)
          if (env[key] !== undefined) {
            lines.push(`${key}=${env[key]}`)
          } else {
            lines.push(line)
          }
        } else {
          lines.push(line)
        }
      })
    }
    
    // 添加新的键
    for (const [key, value] of Object.entries(env)) {
      if (!existingKeys.has(key)) {
        lines.push(`${key}=${value}`)
      }
    }
    
    fs.writeFileSync(ENV_FILE_PATH, lines.join('\n'), 'utf-8')
    console.log('[Hermes] .env file updated')
    return true
  } catch (err) {
    console.error('[Hermes] Failed to write .env file:', err.message)
    return false
  }
}

// 更新单个环境变量
function updateEnvVar(key, value) {
  const env = readEnvFile()
  env[key] = value
  return writeEnvFile(env)
}

// 初始化配置（从环境变量和 .env 文件）
export function initHermesConfig(envConfig) {
  // 优先从 .env 文件读取
  const envFile = readEnvFile()
  
  hermesConfig.webUrl = envFile.HERMES_WEB_URL || envConfig.HERMES_WEB_URL || 'http://localhost:9119'
  hermesConfig.apiUrl = envFile.HERMES_API_URL || envConfig.HERMES_API_URL || 'http://localhost:8642'
  hermesConfig.apiKey = envFile.HERMES_API_KEY || envConfig.HERMES_API_KEY || ''
  console.log(`[Hermes] Proxy initialized: web=${hermesConfig.webUrl}, api=${hermesConfig.apiUrl}`)
}

function debug(...args) {
  console.log('[Hermes]', ...args)
}

function getHermesWebUrl() {
  return hermesConfig.webUrl
}

function getHermesApiUrl() {
  return hermesConfig.apiUrl
}

function getHermesApiKey() {
  return hermesConfig.apiKey
}

function buildProxyHeaders(req, targetBaseUrl = '', dashboardToken = null) {
  const headers = {}
  // 转发 Content-Type
  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type']
  }
  // 转发 X-Hermes-Session-Id (关键：用于会话连续性)
  if (req.headers['x-hermes-session-id']) {
    headers['X-Hermes-Session-Id'] = req.headers['x-hermes-session-id']
    console.log('[Hermes] Forwarding X-Hermes-Session-Id:', req.headers['x-hermes-session-id'])
  }

  // 判断目标是 Dashboard (9119) 还是 API Server (8642)
  const isDashboard = targetBaseUrl.includes(':9119')
  
  if (isDashboard && dashboardToken) {
    // Dashboard API 使用临时会话 Token
    headers['Authorization'] = `Bearer ${dashboardToken}`
    console.log('[Hermes] Using Dashboard session token for authentication')
  } else if (isDashboard) {
    // Dashboard 但没有 Token，尝试继续（某些端点不需要认证）
    console.log('[Hermes] Dashboard request without token')
  } else {
    // API Server 使用 HERMES_API_KEY
    const serverApiKey = getHermesApiKey()
    const clientAuth = req.headers.authorization
    const bearerMatch = clientAuth ? clientAuth.match(/^Bearer\s+(.+)$/i) : null
    const clientToken = bearerMatch ? bearerMatch[1].trim() : null

    if (clientToken && serverApiKey && clientToken === serverApiKey) {
      headers['Authorization'] = `Bearer ${clientToken}`
      console.log('[Hermes] Forwarding valid client Authorization')
    } else if (serverApiKey) {
      headers['Authorization'] = `Bearer ${serverApiKey}`
      if (clientToken && clientToken !== serverApiKey) {
        console.log('[Hermes] Client token mismatch, using server HERMES_API_KEY')
      } else {
        console.log('[Hermes] Using server HERMES_API_KEY for authentication')
      }
    } else if (clientToken) {
      headers['Authorization'] = `Bearer ${clientToken}`
      console.log('[Hermes] Forwarding client Authorization (no server HERMES_API_KEY)')
    } else {
      console.log('[Hermes] WARNING: No Authorization header available')
    }
  }
  return headers
}

async function proxyRequest(req, res, targetBaseUrl, path) {
  return new Promise(async (resolve, reject) => {
    const targetUrl = new URL(path, targetBaseUrl)
    const queryString = req.originalUrl.split('?')[1]
    if (queryString) {
      targetUrl.search = queryString
    }

    // 判断是否是 Dashboard API，如果是则获取 Token
    const isDashboard = targetBaseUrl.includes(':9119')
    let token = null
    if (isDashboard) {
      try {
        token = await fetchDashboardToken(targetBaseUrl)
      } catch (err) {
        console.log('[Hermes] Failed to get dashboard token, proceeding without it')
      }
    }

    const headers = buildProxyHeaders(req, targetBaseUrl, token)
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port,
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers,
    }

    console.log('[Hermes] Proxying request:', req.method, path, '->', targetUrl.toString())

    const proxyReq = http.request(options, (proxyRes) => {
      console.log('[Hermes] Response from upstream:', proxyRes.statusCode, path)
      
      // 如果是 401 错误，记录响应体以便调试
      if (proxyRes.statusCode === 401) {
        let body = ''
        proxyRes.on('data', (chunk) => { body += chunk })
        proxyRes.on('end', () => {
          console.log('[Hermes] 401 Response body:', body.substring(0, 500))
        })
      }
      
      // 转发状态码
      res.status(proxyRes.statusCode)

      // 转发响应头
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        try {
          res.setHeader(key, value)
        } catch (e) {
          // 忽略已设置的头部
        }
      }

      // Pipe 响应体
      proxyRes.pipe(res)
      proxyRes.on('end', () => resolve())
      proxyRes.on('error', (err) => reject(err))
    })

    proxyReq.on('error', (err) => {
      console.error('[Hermes] Proxy request failed:', err.message)
      reject(err)
    })

    // 转发请求体（如果有）
    if (req.body && Object.keys(req.body).length > 0) {
      proxyReq.write(JSON.stringify(req.body))
    }
    proxyReq.end()
  })
}

async function proxySSEStream(req, res, targetBaseUrl, path) {
  const targetUrl = new URL(path, targetBaseUrl)
  const queryString = req.originalUrl.split('?')[1]
  if (queryString) {
    targetUrl.search = queryString
  }

  // 判断是否是 Dashboard API，如果是则获取 Token
  const isDashboard = targetBaseUrl.includes(':9119')
  let token = null
  if (isDashboard) {
    try {
      token = await fetchDashboardToken(targetBaseUrl)
    } catch (err) {
      console.log('[Hermes] Failed to get dashboard token for SSE, proceeding without it')
    }
  }

  const headers = buildProxyHeaders(req, targetBaseUrl, token)
  headers['Accept'] = 'text/event-stream'
  // SSE 不需要 Content-Length，使用 chunked transfer
  delete headers['Content-Length']
  // 如果有请求体，设置正确的 Content-Length
  const bodyStr = req.body ? JSON.stringify(req.body) : ''
  if (bodyStr) {
    headers['Content-Length'] = Buffer.byteLength(bodyStr)
  }

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers,
    timeout: 300000, // 5 分钟超时
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  // 跟踪上游是否已完成，防止客户端提前断开时销毁仍在进行的代理请求
  let upstreamDone = false

  const proxyReq = http.request(options, (proxyRes) => {
    // 如果上游返回非 SSE 响应（如错误），正常转发
    if (proxyRes.statusCode !== 200) {
      // 只有在头部未发送时才移除 SSE 相关头部
      if (!res.headersSent) {
        res.removeHeader('Content-Type')
        res.removeHeader('Cache-Control')
        res.removeHeader('Connection')
        res.removeHeader('X-Accel-Buffering')
      }
      res.status(proxyRes.statusCode)
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        try {
          res.setHeader(key, value)
        } catch (e) {
          // 忽略
        }
      }
      proxyRes.pipe(res)
      return
    }

    // SSE 流式透传 - 转发上游响应头（包括 X-Hermes-Session-Id）
    if (!res.headersSent) {
      // 转发重要的响应头
      const headersToForward = ['x-hermes-session-id', 'x-request-id']
      for (const key of headersToForward) {
        const value = proxyRes.headers[key]
        if (value) {
          res.setHeader(key, value)
          console.log(`[Hermes] Forwarding response header: ${key}=${value}`)
        }
      }
    }

    // SSE 流式透传（带日志）
    let logBuffer = ''
    proxyRes.on('data', (chunk) => {
      const text = chunk.toString()
      logBuffer += text
      // 检测 tool_calls
      if (text.includes('tool_calls') || text.includes('tool_responses')) {
        console.log('[Hermes] Tool event detected:', text.substring(0, 500))
      }
    })
    proxyRes.pipe(res)

    proxyRes.on('end', () => {
      upstreamDone = true
    })

    proxyRes.on('error', (err) => {
      console.error('[Hermes] SSE stream error:', err.message)
      if (!res.writableEnded) {
        res.end()
      }
    })
  })

  proxyReq.on('error', (err) => {
    console.error('[Hermes] SSE request failed:', err.message)
    if (!res.headersSent) {
      res.status(502).json({ error: 'Hermes proxy error', message: err.message })
    } else if (!res.writableEnded) {
      res.end()
    }
  })

  proxyReq.on('timeout', () => {
    console.error('[Hermes] SSE request timed out')
    if (!proxyReq.destroyed) {
      proxyReq.destroy(new Error('Request timed out'))
    }
  })

  // 转发请求体
  if (bodyStr) {
    proxyReq.write(bodyStr)
  }
  proxyReq.end()

  // 客户端断开时关闭代理请求（仅在上游未完成时）
  res.on('close', () => {
    if (!proxyReq.destroyed && !upstreamDone && !res.writableEnded) {
      debug('SSE: client disconnected before stream finished, destroying proxy request')
      proxyReq.destroy()
    }
  })
}

// ==================== 连接管理 ====================

// 应用认证中间件到所有 Hermes API 路由
router.use(authWrapper)

// 获取当前连接配置
router.get('/api/hermes/connect', (req, res) => {
  res.json({
    webUrl: hermesConfig.webUrl,
    apiUrl: hermesConfig.apiUrl,
    hasApiKey: !!hermesConfig.apiKey,
  })
})

// 设置连接参数
router.post('/api/hermes/connect', (req, res) => {
  const { webUrl, apiUrl, apiKey } = req.body || {}

  if (webUrl) {
    hermesConfig.webUrl = webUrl
    updateEnvVar('HERMES_WEB_URL', webUrl)
  }
  if (apiUrl) {
    hermesConfig.apiUrl = apiUrl
    updateEnvVar('HERMES_API_URL', apiUrl)
  }
  if (apiKey !== undefined) {
    hermesConfig.apiKey = apiKey
    updateEnvVar('HERMES_API_KEY', apiKey)
  }

  console.log(`[Hermes] Connection updated: web=${hermesConfig.webUrl}, api=${hermesConfig.apiUrl}`)
  res.json({ ok: true, webUrl: hermesConfig.webUrl, apiUrl: hermesConfig.apiUrl })
})

// 更新 API Key（专用接口，支持验证）
router.post('/api/hermes/api-key', async (req, res) => {
  const { apiKey, validate } = req.body || {}

  if (apiKey === undefined) {
    return res.status(400).json({ ok: false, error: 'apiKey is required' })
  }

  // 如果需要验证，先测试新 API Key 是否有效
  if (validate && apiKey) {
    try {
      const testResult = await new Promise((resolve) => {
        const url = new URL('/api/status', hermesConfig.webUrl || 'http://localhost:9119')
        http.get({
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          headers: { 'Authorization': `Bearer ${apiKey}` },
          timeout: 5000,
        }, (proxyRes) => {
          let data = ''
          proxyRes.on('data', (chunk) => { data += chunk })
          proxyRes.on('end', () => {
            resolve({ ok: proxyRes.statusCode === 200, status: proxyRes.statusCode })
          })
        }).on('error', (err) => {
          resolve({ ok: false, error: err.message })
        }).on('timeout', () => {
          resolve({ ok: false, error: 'Timeout' })
        })
      })

      if (!testResult.ok) {
        return res.status(400).json({ 
          ok: false, 
          error: `API Key validation failed: ${testResult.error || `status ${testResult.status}`}` 
        })
      }
    } catch (err) {
      return res.status(400).json({ ok: false, error: `Validation error: ${err.message}` })
    }
  }

  // 更新内存中的 API Key
  hermesConfig.apiKey = apiKey

  // 写入 .env 文件
  const writeSuccess = updateEnvVar('HERMES_API_KEY', apiKey)
  if (!writeSuccess) {
    console.warn('[Hermes] API Key updated in memory but failed to write to .env')
  }

  console.log('[Hermes] API Key updated')
  res.json({ ok: true, message: 'API Key updated successfully' })
})

// 测试连接
router.post('/api/hermes/test-connection', async (req, res) => {
  const results = {}

  // 测试 Web UI API
  if (hermesConfig.webUrl) {
    try {
      await new Promise((resolve, reject) => {
        const url = new URL('/api/status', hermesConfig.webUrl)
        const headers = {}
        const apiKey = getHermesApiKey()
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

        http.get({
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          headers,
          timeout: 5000,
        }, (proxyRes) => {
          let data = ''
          proxyRes.on('data', (chunk) => { data += chunk })
          proxyRes.on('end', () => {
            results.web = { ok: proxyRes.statusCode === 200, status: proxyRes.statusCode, data: data.substring(0, 200) }
            resolve()
          })
        }).on('error', (err) => {
          results.web = { ok: false, error: err.message }
          resolve()
        }).on('timeout', () => {
          results.web = { ok: false, error: 'Timeout' }
          resolve()
        })
      })
    } catch (err) {
      results.web = { ok: false, error: err.message }
    }
  } else {
    results.web = { ok: false, error: 'Web URL not configured' }
  }

  // 测试 API Server
  if (hermesConfig.apiUrl) {
    try {
      await new Promise((resolve, reject) => {
        const url = new URL('/health', hermesConfig.apiUrl)
        const headers = {}
        const apiKey = getHermesApiKey()
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

        http.get({
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          headers,
          timeout: 5000,
        }, (proxyRes) => {
          let data = ''
          proxyRes.on('data', (chunk) => { data += chunk })
          proxyRes.on('end', () => {
            results.api = { ok: proxyRes.statusCode === 200, status: proxyRes.statusCode, data: data.substring(0, 200) }
            resolve()
          })
        }).on('error', (err) => {
          results.api = { ok: false, error: err.message }
          resolve()
        }).on('timeout', () => {
          results.api = { ok: false, error: 'Timeout' }
          resolve()
        })
      })
    } catch (err) {
      results.api = { ok: false, error: err.message }
    }
  } else {
    results.api = { ok: false, error: 'API URL not configured' }
  }

  res.json(results)
})

// ==================== Hermes Web UI API 代理 (端口 9119) ====================

// GET /api/hermes/status
router.get('/api/hermes/status', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/status')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/sessions
router.get('/api/hermes/sessions', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/sessions')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/sessions/search
router.get('/api/hermes/sessions/search', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/sessions/search')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/sessions/:id
router.get('/api/hermes/sessions/:id', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/sessions/${req.params.id}`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/sessions/:id/messages
router.get('/api/hermes/sessions/:id/messages', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/sessions/${req.params.id}/messages`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// DELETE /api/hermes/sessions/:id
router.delete('/api/hermes/sessions/:id', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/sessions/${req.params.id}`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/config
router.get('/api/hermes/config', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/config')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/config/defaults
router.get('/api/hermes/config/defaults', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/config/defaults')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/config/schema
router.get('/api/hermes/config/schema', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/config/schema')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// PUT /api/hermes/config
router.put('/api/hermes/config', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/config')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/config/raw
router.get('/api/hermes/config/raw', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/config/raw')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// PUT /api/hermes/config/raw
router.put('/api/hermes/config/raw', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/config/raw')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/env
router.get('/api/hermes/env', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/env')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// PUT /api/hermes/env
router.put('/api/hermes/env', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/env')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// DELETE /api/hermes/env
router.delete('/api/hermes/env', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/env')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// POST /api/hermes/env/reveal
router.post('/api/hermes/env/reveal', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/env/reveal')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/logs
router.get('/api/hermes/logs', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/logs')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// ==================== Cron Jobs ====================

// GET /api/hermes/cron/jobs
router.get('/api/hermes/cron/jobs', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/cron/jobs')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// GET /api/hermes/cron/jobs/:id
router.get('/api/hermes/cron/jobs/:id', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/cron/jobs/${req.params.id}`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// POST /api/hermes/cron/jobs
router.post('/api/hermes/cron/jobs', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/cron/jobs')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// PUT /api/hermes/cron/jobs/:id
router.put('/api/hermes/cron/jobs/:id', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/cron/jobs/${req.params.id}`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// POST /api/hermes/cron/jobs/:id/pause
router.post('/api/hermes/cron/jobs/:id/pause', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/cron/jobs/${req.params.id}/pause`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// POST /api/hermes/cron/jobs/:id/resume
router.post('/api/hermes/cron/jobs/:id/resume', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/cron/jobs/${req.params.id}/resume`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// POST /api/hermes/cron/jobs/:id/trigger
router.post('/api/hermes/cron/jobs/:id/trigger', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/cron/jobs/${req.params.id}/trigger`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// DELETE /api/hermes/cron/jobs/:id
router.delete('/api/hermes/cron/jobs/:id', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), `/api/cron/jobs/${req.params.id}`)
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// ==================== Skills ====================

// GET /api/hermes/skills
router.get('/api/hermes/skills', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/skills')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// PUT /api/hermes/skills/toggle
router.put('/api/hermes/skills/toggle', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/skills/toggle')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// ==================== Tools ====================

// GET /api/hermes/tools/toolsets
router.get('/api/hermes/tools/toolsets', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/tools/toolsets')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// ==================== Analytics ====================

// GET /api/hermes/analytics/usage
router.get('/api/hermes/analytics/usage', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesWebUrl(), '/api/analytics/usage')
  } catch (err) {
    res.status(502).json({ error: 'Hermes Web UI unavailable', message: err.message })
  }
})

// ==================== Hermes API Server 代理 (端口 8642) ====================

// GET /api/hermes/v1/models
router.get('/api/hermes/v1/models', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesApiUrl(), '/v1/models')
  } catch (err) {
    res.status(502).json({ error: 'Hermes API Server unavailable', message: err.message })
  }
})

// POST /api/hermes/v1/chat/completions (流式或非流式)
router.post('/api/hermes/v1/chat/completions', (req, res) => {
    const isStream = req.body && req.body.stream === true
    if (isStream) {
    proxySSEStream(req, res, getHermesApiUrl(), '/v1/chat/completions')
  } else {
    proxyRequest(req, res, getHermesApiUrl(), '/v1/chat/completions').catch((err) => {
      if (!res.headersSent) {
        res.status(502).json({ error: 'Hermes API Server unavailable', message: err.message })
      }
    })
  }
})

// POST /api/hermes/v1/runs
router.post('/api/hermes/v1/runs', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesApiUrl(), '/v1/runs')
  } catch (err) {
    res.status(502).json({ error: 'Hermes API Server unavailable', message: err.message })
  }
})

// GET /api/hermes/v1/runs/:id/events (SSE 流式透传)
router.get('/api/hermes/v1/runs/:id/events', (req, res) => {
  proxySSEStream(req, res, getHermesApiUrl(), `/v1/runs/${req.params.id}/events`)
})

// GET /api/hermes/health
router.get('/api/hermes/health', async (req, res) => {
  try {
    await proxyRequest(req, res, getHermesApiUrl(), '/health')
  } catch (err) {
    res.status(502).json({ error: 'Hermes API Server unavailable', message: err.message })
  }
})

export default router
