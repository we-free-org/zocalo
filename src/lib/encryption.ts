import crypto from 'crypto'

// Encryption configuration
const ALGORITHM = 'aes-256-cbc'
const KEY_LENGTH = 32  // 256 bits
const IV_LENGTH = 16   // 128 bits

// Get encryption key from environment
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  return key
}

// Derive a consistent 256-bit key from the master key
function deriveKey(masterKey: string): Buffer {
  return crypto.createHash('sha256').update(masterKey).digest()
}

// Encrypt text using AES-256-CBC
export function encryptMessage(plaintext: string): string {
  try {
    // Derive encryption key
    const key = deriveKey(getEncryptionKey())
    
    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH)
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Combine IV + encrypted data
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, 'hex')
    ])
    
    // Return base64 encoded result
    return combined.toString('base64')
    
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt message')
  }
}

// Decrypt text using AES-256-CBC
export function decryptMessage(encryptedData: string): string {
  try {
    // Derive decryption key
    const key = deriveKey(getEncryptionKey())
    
    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64')
    
    // Extract IV and encrypted data
    const iv = combined.subarray(0, IV_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH)
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, undefined, 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
    
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt message')
  }
}

// Client-side encryption (for browser environment)
export async function encryptMessageClient(plaintext: string): Promise<string> {
  // For client-side, we'll need to handle this differently
  // For now, return plaintext as we'll handle encryption server-side
  return plaintext
}

// Client-side decryption (for browser environment)  
export async function decryptMessageClient(encryptedData: string): Promise<string> {
  // For client-side, we'll need to handle this differently
  // For now, return as-is since we'll handle decryption server-side
  return encryptedData
}

// Check if message should be encrypted based on global settings
export function shouldEncryptMessages(encryptionSetting: string): boolean {
  return encryptionSetting === 'instance_key' || encryptionSetting === 'e2ee'
}

// Get encryption type for new messages
export function getEncryptionType(encryptionSetting: string): string {
  switch (encryptionSetting) {
    case 'instance_key':
      return 'instance_key'
    case 'e2ee':
      return 'e2ee'
    default:
      return 'none'
  }
} 