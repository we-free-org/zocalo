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
  User,
  Activity,
  LayoutGrid,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface SidebarProps {
  currentSection: string
  onSectionChange: (section: string) => void
}

interface SubMenuItem {
  id: string
  label: string
  href: string
}

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  submenu?: SubMenuItem[]
}

export function Sidebar({ currentSection, onSectionChange }: SidebarProps) {
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  
  const mainSections: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'channels', label: 'Channels', icon: Hash },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'votes', label: 'Votes', icon: Vote },
    { 
      id: 'apps', 
      label: 'Apps', 
      icon: LayoutGrid,
      submenu: [
        { id: 'projects', label: 'Projects App', href: '/app/projects' }
      ]
    },
  ]

  const lowerSections: NavItem[] = [
    { id: 'conversations', label: 'Conversations', icon: MessageCircle },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'activity', label: 'Activity', icon: Activity }
  ]

  const pathname = usePathname()

  const NavButton = ({ item }: { item: NavItem }) => {
    const Icon = item.icon
    const hasSubmenu = item.submenu && item.submenu.length > 0
    const isSubmenuOpen = openSubmenu === item.id
    const isActive = pathname.includes(`/${item.id}`) || 
                    (pathname === '/' && item.id === 'home') ||
                    (item.submenu && item.submenu.some(sub => pathname.includes(sub.href)))

    const handleClick = () => {
      if (hasSubmenu) {
        setOpenSubmenu(isSubmenuOpen ? null : item.id)
      } else {
        onSectionChange(item.id)
        if (item.id === 'home') {
          window.location.href = '/'
        } else {
          window.location.href = `/${item.id}`
        }
      }
    }

    return (
      <div className="relative">
        <button
          onClick={handleClick}
          className={cn(
            'w-full flex items-center justify-center p-3 rounded-lg transition-colors group relative',
            isActive 
              ? 'bg-[rgb(255,113,67)] text-white' 
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          title={item.label}
        >
          <Icon className="h-5 w-5" />
          {hasSubmenu && (
            <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
              {isSubmenuOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </div>
          )}
          
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border">
            {item.label}
          </div>
        </button>
        
        {/* Submenu */}
        {hasSubmenu && isSubmenuOpen && (
          <div className="absolute left-full top-0 ml-2 bg-popover border rounded-md shadow-lg py-1 z-50 min-w-[150px]">
            {item.submenu!.map((subItem) => (
              <button
                key={subItem.id}
                onClick={() => {
                  window.location.href = subItem.href
                  setOpenSubmenu(null)
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors',
                  pathname.includes(subItem.href) 
                    ? 'bg-accent text-accent-foreground' 
                    : 'text-popover-foreground'
                )}
              >
                {subItem.label}
              </button>
            ))}
          </div>
        )}
      </div>
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