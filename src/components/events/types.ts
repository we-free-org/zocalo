export interface Event {
  id: string
  title: string
  summary?: string
  event_start: string
  event_end?: string
  event_location?: string
  event_link?: string
  metadata?: any
  created_at: string
} 