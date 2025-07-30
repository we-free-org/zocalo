import CryptoJS from 'crypto-js'

// Encryption configuration
const ITERATIONS = 100000

// Get encryption key from environment
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  return key
}

// Encrypt text using AES with PBKDF2 key derivation
export function encryptMessage(plaintext: string): string {
  try {
    const masterKey = getEncryptionKey()
    
    // Generate random salt
    const salt = CryptoJS.lib.WordArray.random(256/8) // 32 bytes
    
    // Derive key using PBKDF2
    const key = CryptoJS.PBKDF2(masterKey, salt, {
      keySize: 256/32, // 32 bytes
      iterations: ITERATIONS,
      hasher: CryptoJS.algo.SHA512
    })
    
    // Generate random IV
    const iv = CryptoJS.lib.WordArray.random(128/8) // 16 bytes
    
    // Encrypt using AES-256-CBC
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })
    
    // Combine salt + iv + encrypted data
    const combined = salt.concat(iv).concat(encrypted.ciphertext)
    
    // Return base64 encoded result
    return CryptoJS.enc.Base64.stringify(combined)
    
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt message')
  }
}

// Decrypt text using AES with PBKDF2 key derivation
export function decryptMessage(encryptedData: string): string {
  try {
    const masterKey = getEncryptionKey()
    
    // Parse base64 data
    const combined = CryptoJS.enc.Base64.parse(encryptedData)
    
    // Extract components
    const salt = CryptoJS.lib.WordArray.create(combined.words.slice(0, 8)) // 32 bytes = 8 words
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(8, 12)) // 16 bytes = 4 words  
    const encrypted = CryptoJS.lib.WordArray.create(combined.words.slice(12)) // remaining bytes
    
    // Derive key using same parameters
    const key = CryptoJS.PBKDF2(masterKey, salt, {
      keySize: 256/32, // 32 bytes
      iterations: ITERATIONS,
      hasher: CryptoJS.algo.SHA512
    })
    
    // Create cipher params object
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: encrypted
    })
    
    // Decrypt using AES-256-CBC
    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })
    
    // Convert to UTF8 string
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8)
    
    if (!decryptedText) {
      throw new Error('Decryption resulted in empty string')
    }
    
    return decryptedText
    
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