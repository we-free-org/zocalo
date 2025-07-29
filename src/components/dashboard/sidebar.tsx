'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { 
  Home,
  Hash, 
  Calendar, 
  FileText, 
  Vote, 
  MessageCircle, 
  Users, 
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface SidebarProps {
  currentSection: string
  onSectionChange: (section: string) => void
}

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export function Sidebar({ currentSection, onSectionChange }: SidebarProps) {
  const mainSections: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'channels', label: 'Channels', icon: Hash },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'vote', label: 'Vote', icon: Vote },
  ]

  const lowerSections: NavItem[] = [
    { id: 'conversations', label: 'Conversations', icon: MessageCircle },
    { id: 'members', label: 'Members', icon: Users }
  ]

  const pathname = usePathname()

  const NavButton = ({ item }: { item: NavItem }) => {
    const Icon = item.icon
    const isActive = pathname.includes(`/dashboard/${item.id}`) || 
                    (pathname === '/dashboard' && item.id === 'home')

    return (
      <button
        onClick={() => {
          onSectionChange(item.id)
          // Navigate to the appropriate page
          if (item.id === 'home') {
            window.location.href = '/dashboard'
          } else {
            window.location.href = `/dashboard/${item.id}`
          }
        }}
        className={cn(
          'w-full flex items-center justify-center p-3 rounded-lg transition-colors group relative',
          isActive 
            ? 'bg-[rgb(255,113,67)] text-white' 
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        )}
        title={item.label}
      >
        <Icon className="h-5 w-5" />
        
        {/* Tooltip */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border">
          {item.label}
        </div>
      </button>
    )
  }

  return (
    <div className="w-20 bg-card border-r flex flex-col py-6">
      {/* Main sections */}
      <Image src="/logo.svg" alt="zocalo" width={30} height={30} className="mx-auto mb-6" />
      <div className="flex-1 space-y-3 px-2 ">
        {mainSections.map((item) => (
          <NavButton key={item.id} item={item} />
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-border mx-4 my-6" />

      {/* Lower sections */}
      <div className="space-y-3 px-2">
        {lowerSections.map((item) => (
          <NavButton key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
} 