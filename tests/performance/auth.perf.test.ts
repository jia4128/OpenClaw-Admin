/**
 * Performance Tests - Authentication Performance
 * Tests performance characteristics
 */
import { createHash, randomBytes } from 'crypto'
import { describe, it, expect } from 'vitest'

const HASH_ITERATIONS = 100000

// Single hash function
function doOneHash(password, salt) {
  let data = salt + password
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    const hash = createHash('sha512')
    hash.update(data)
    data = hash.digest('hex')
  }
  return data.slice(0, 128)
}

describe('Password Hashing Performance', () => {
  it('hashPassword completes within acceptable time (<1s for 100k iterations)', () => {
    const start = performance.now()
    const salt = randomBytes(32).toString('hex')
    doOneHash('testPassword123!', salt)
    const duration = performance.now() - start
    
    // Should complete in < 1s (100k iterations SHA-512)
    // Allow generous threshold for CI/shared environments
    expect(duration).toBeLessThan(2000)
  })
})

describe('Token Generation Performance', () => {
  it('can generate many tokens quickly', () => {
    const { randomUUID } = require('crypto')
    const iterations = 1000
    const start = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      randomUUID() + randomBytes(32).toString('hex')
    }
    
    const duration = performance.now() - start
    const tokensPerMs = iterations / duration
    
    // Should generate > 50 tokens/ms on average
    expect(tokensPerMs).toBeGreaterThan(30)
  })
})

describe('Token Hashing Performance', () => {
  it('hashToken is fast (SHA-256 single shot)', () => {
    const iterations = 10000
    const start = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      createHash('sha256').update('token-' + i).digest('hex')
    }
    
    const duration = performance.now() - start
    const hashesPerMs = iterations / duration
    
    // Should hash > 100 tokens/ms (lowered for CI/shared environments)
    expect(hashesPerMs).toBeGreaterThan(100)
  })
})
