import crypto from 'crypto'

// AES-256-CBC encryption configuration
const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16
const SALT_LENGTH = 32
const ITERATIONS = 100000

// Get encryption key from environment
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  return key
}

// Derive key from master key and salt using PBKDF2
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, 32, 'sha512')
}

// Encrypt text using AES-256-CBC
export function encryptMessage(plaintext: string): string {
  try {
    const masterKey = getEncryptionKey()
    
    // Generate random salt
    const salt = crypto.randomBytes(SALT_LENGTH)
    
    // Derive encryption key
    const key = deriveKey(masterKey, salt)
    
    // Create cipher
    const cipher = crypto.createCipher(ALGORITHM, key)
    
    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Combine salt + encrypted data
    const combined = Buffer.concat([
      salt,
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
    const masterKey = getEncryptionKey()
    
    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64')
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH)
    const encrypted = combined.subarray(SALT_LENGTH)
    
    // Derive decryption key
    const key = deriveKey(masterKey, salt)
    
    // Create decipher
    const decipher = crypto.createDecipher(ALGORITHM, key)
    
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