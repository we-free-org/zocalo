import { supabase } from './client'

export interface GlobalSettings {
  instanceName: string
  instanceDomain: string
  allowPublicSignup: boolean
  requireEmailConfirmation: boolean
  setupCompleted: boolean
}

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const { data: settings, error } = await supabase
    .from('settings')
    .select('key, value')
    .eq('scope', 'global')
    .eq('is_public', true)

  if (error) {
    console.error('Error fetching global settings:', error)
    throw error
  }

  // Convert settings array to object
  const settingsMap = settings.reduce((acc, setting) => {
    if (typeof setting.value === 'string') {
      // Try to parse as JSON, but fall back to plain string if it fails
      try {
        acc[setting.key] = JSON.parse(setting.value)
      } catch {
        // If JSON parsing fails, use the raw string value
        acc[setting.key] = setting.value
      }
    } else {
      // If it's already an object/value, use it directly
      acc[setting.key] = setting.value
    }
    return acc
  }, {} as Record<string, any>)

  return {
    instanceName: settingsMap.instance_name || 'Zocalo Instance',
    instanceDomain: settingsMap.instance_domain || '',
    allowPublicSignup: settingsMap.allow_public_signup !== false,
    requireEmailConfirmation: settingsMap.require_email_confirmation !== false,
    setupCompleted: settingsMap.setup_completed === true
  }
}

/**
 * Check if initial setup has been completed
 * Setup is considered complete if:
 * 1. instance_name is different from default "Zocalo Instance", OR
 * 2. There are more than 1 users in the system
 */
export async function isSetupCompleted(): Promise<boolean> {
  try {
    // Check settings for setup_completed flag first
    const { data: setupFlag } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'setup_completed')
      .eq('scope', 'global')
      .single()

    if (setupFlag?.value === true) {
      return true
    }

    // Check if instance name has been changed from default
    const { data: instanceNameSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'instance_name')
      .eq('scope', 'global')
      .single()

    const instanceName = instanceNameSetting?.value
    if (instanceName && instanceName !== '"Zocalo Instance"' && instanceName !== 'Zocalo Instance') {
      return true
    }

    // Check user count (if more than 1 user exists, setup is likely complete)
    const { count: userCount, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Error checking user count:', countError)
      return false
    }

    return (userCount || 0) > 1

  } catch (error) {
    console.error('Error checking setup completion:', error)
    return false
  }
} 