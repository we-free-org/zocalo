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