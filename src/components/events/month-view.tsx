'use client'

import { Event } from './types'

interface MonthViewProps {
  events: Event[]
  calendarMonth: Date
  onEventSelect?: (event: Event) => void
}

export function MonthView({ events, calendarMonth, onEventSelect }: MonthViewProps) {
  // Helper function to get all days in the month view (including prev/next month days)
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    const endDate = new Date(lastDay)
    
    // Adjust to start on Monday
    const startDayOfWeek = firstDay.getDay()
    const daysToSubtract = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1
    startDate.setDate(firstDay.getDate() - daysToSubtract)
    
    // Adjust to end on Sunday
    const endDayOfWeek = lastDay.getDay()
    const daysToAdd = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek
    endDate.setDate(lastDay.getDate() + daysToAdd)
    
    const days = []
    const current = new Date(startDate)
    while (current <= endDate) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return days
  }

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.event_start)
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

  const monthDays = getMonthDays(calendarMonth)
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  
  return (
    <div className="flex-1 p-4">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 h-full pb-12">
        {monthDays.map((day, index) => {
          const dayEvents = getEventsForDate(day)
          const isCurrentMonth = day.getMonth() === calendarMonth.getMonth()
          const isToday = day.toDateString() === new Date().toDateString()
          
          return (
            <div
              key={index}
              className={`border rounded p-2 min-h-24 ${
                isCurrentMonth ? 'bg-background' : 'bg-muted/30'
              } ${isToday ? 'border-purple-500 bg-purple-50' : 'border-border'}`}
            >
              <div className={`text-sm mb-1 ${
                isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
              } ${isToday ? 'font-bold text-purple-600' : ''}`}>
                {day.getDate()}
              </div>
              
              {/* Events */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    onClick={() => onEventSelect?.(event)}
                    className="flex items-center space-x-1 cursor-pointer hover:bg-accent rounded px-1 py-0.5"
                  >
                    <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{event.title}</div>
                      <div className="text-xs text-muted-foreground">{formatEventTime(event.event_start)}</div>
                    </div>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
} 