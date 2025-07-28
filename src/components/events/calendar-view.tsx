'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WeekView } from './week-view'
import { MonthView } from './month-view'
import { Event } from './types'

interface CalendarViewProps {
  events: Event[]
  onEventSelect?: (event: Event) => void
}

export function CalendarView({ events, onEventSelect }: CalendarViewProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [numberOfMonths, setNumberOfMonths] = useState(3)
  const [showMonthSelector, setShowMonthSelector] = useState(true)
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('month')
  const [currentWeek, setCurrentWeek] = useState(new Date())
  
  // Generate year options (current year ± 5 years)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)
  
  // Update calendar month when year changes (but not on initial mount)
  const [isInitialMount, setIsInitialMount] = useState(true)
  
  useEffect(() => {
    if (isInitialMount) {
      setIsInitialMount(false)
      return
    }
    // Only reset to January if user explicitly changed the year
    setCalendarMonth(new Date(selectedYear, 0, 1))
  }, [selectedYear])

  // Calculate dynamic number of months based on available width
  useEffect(() => {
    const calculateMonths = () => {
      const windowWidth = window.innerWidth
      const leftNavWidth = 80
      const sidebarWidth = 384
      const padding = 32
      
      const availableWidth = windowWidth - leftNavWidth - sidebarWidth - padding
      const monthsToShow = Math.floor(availableWidth / 250)
      
      setNumberOfMonths(Math.max(1, Math.min(monthsToShow, 6)))
    }

    calculateMonths()
    window.addEventListener('resize', calculateMonths)
    
    return () => window.removeEventListener('resize', calculateMonths)
  }, [])

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Calendar Header */}
      <div className="border-b bg-card p-4">
        {/* Multi-Month Calendar (collapsible) */}
        

        {/* View Controls */}
        <div className="flex items-center justify-between mt-0 mb-2">
          <div className="flex items-center space-x-4">
            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (calendarView === 'week') {
                    const newWeek = new Date(currentWeek)
                    newWeek.setDate(newWeek.getDate() - 7)
                    setCurrentWeek(newWeek)
                  } else {
                    const newMonth = new Date(calendarMonth)
                    newMonth.setMonth(newMonth.getMonth() - 1)
                    setCalendarMonth(newMonth)
                  }
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {/* Clickable Month/Year Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20 hover:from-purple-500/15 hover:to-purple-500/10 hover:border-purple-500/30 cursor-pointer transition-all duration-200 shadow-sm">
                    <span className="text-sm font-bold text-purple-600">
                      {calendarView === 'week' 
                        ? `Week of ${currentWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      }
                    </span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-80">
                  <div className="p-4 space-y-4">
                    <div className="text-sm font-medium text-center">Jump to Date</div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Month Selector */}
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Month</label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              {calendarMonth.toLocaleDateString('en-US', { month: 'long' })}
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {Array.from({ length: 12 }, (_, i) => {
                              const monthDate = new Date(calendarMonth.getFullYear(), i, 1)
                              return (
                                <DropdownMenuItem
                                  key={i}
                                  onSelect={() => {
                                    const newDate = new Date(calendarMonth)
                                    newDate.setMonth(i)
                                    setCalendarMonth(newDate)
                                    if (calendarView === 'week') {
                                      setCurrentWeek(newDate)
                                    }
                                  }}
                                >
                                  {monthDate.toLocaleDateString('en-US', { month: 'long' })}
                                </DropdownMenuItem>
                              )
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Year Selector */}
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Year</label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              {calendarMonth.getFullYear()}
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="max-h-60 overflow-y-auto">
                            {yearOptions.map((year) => (
                              <DropdownMenuItem
                                key={year}
                                onSelect={() => {
                                  const newDate = new Date(calendarMonth)
                                  newDate.setFullYear(year)
                                  setCalendarMonth(newDate)
                                  if (calendarView === 'week') {
                                    setCurrentWeek(newDate)
                                  }
                                }}
                              >
                                {year}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (calendarView === 'week') {
                    const newWeek = new Date(currentWeek)
                    newWeek.setDate(newWeek.getDate() + 7)
                    setCurrentWeek(newWeek)
                  } else {
                    const newMonth = new Date(calendarMonth)
                    newMonth.setMonth(newMonth.getMonth() + 1)
                    setCalendarMonth(newMonth)
                  }
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = new Date()
                setCalendarMonth(today)
                setCurrentWeek(today)
              }}
            >
              Today
            </Button>
          </div>
          
          {/* Week/Month Toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={calendarView === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCalendarView('week')}
              className={calendarView === 'week' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
            >
              Week
            </Button>
            <Button
              variant={calendarView === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCalendarView('month')}
              className={calendarView === 'month' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
            >
              Month
            </Button>
          </div>
        </div>

        
      </div>
      
      {/* Calendar Content */}
      {calendarView === 'week' ? (
        <WeekView events={events} currentWeek={currentWeek} onEventSelect={onEventSelect} />
      ) : (
        <MonthView events={events} calendarMonth={calendarMonth} onEventSelect={onEventSelect} />
      )}
    </div>
  )
} 