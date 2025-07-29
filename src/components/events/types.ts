import { Entity, EventEntityData } from '@/lib/entities'

// Event entity with parsed content
export interface Event extends Entity {
  type: 'event'
  parsedContent: EventEntityData
} 