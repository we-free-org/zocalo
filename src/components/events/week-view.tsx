'use client'

import { Event } from './types'

interface WeekViewProps {
  events: Event[]
  currentWeek: Date
  onEventSelect?: (event: Event) => void
}

export function WeekView({ events, currentWeek, onEventSelect }: WeekViewProps) {
  // Helper function to get week days starting from Monday
  const getWeekDays = (date: Date) => {
    const week = []
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
    startOfWeek.setDate(diff)
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }
    return week
  }

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.parsedContent?.event_start || event.created_at)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  // Format event time
  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const weekDays = getWeekDays(currentWeek)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  
  return (
    <div className="flex-1 overflow-hidden">
      <div className="flex h-full">
        {/* Time column (left) */}
        <div className="w-16 border-r">
          <div className="h-12 border-b"></div> {/* Header space */}
          {hours.map(hour => (
            <div key={hour} className="h-12 border-b text-xs text-center py-1 text-muted-foreground">
              {hour.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>
        
        {/* Days columns */}
        <div className="flex-1 flex">
          {weekDays.map((day, index) => (
            <div key={index} className="flex-1 border-r last:border-r-0">
              {/* Day header */}
              <div className="h-12 border-b p-2 text-center">
                <div className="text-sm font-medium">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {day.getDate()}
                </div>
              </div>
              
              {/* Hour slots */}
              <div className="relative">
                {hours.map(hour => (
                  <div key={hour} className="h-12 border-b relative">
                    {/* Events for this hour */}
                    {getEventsForDate(day)
                      .filter(event => new Date(event.parsedContent?.event_start || event.created_at).getHours() === hour)
                      .map(event => (
                        <div
                          key={event.id}
                          onClick={() => onEventSelect?.(event)}
                          className="absolute left-1 right-1 top-1 bg-purple-100 border border-purple-200 rounded p-1 cursor-pointer hover:bg-purple-200 z-10"
                        >
                          <div className="text-xs font-medium truncate">{event.title}</div>
                          <div className="text-xs text-purple-600">{formatEventTime(event.parsedContent?.event_start || event.created_at)}</div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Time column (right) */}
        <div className="w-16 border-l">
          <div className="h-12 border-b"></div>
          {hours.map(hour => (
            <div key={hour} className="h-12 border-b text-xs text-center py-1 text-muted-foreground">
              {hour.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 