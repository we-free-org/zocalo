'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { ChevronDown, Settings, Plus, LogOut, User, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getGlobalSettings } from '@/lib/supabase/settings'
import { useUserStore, useSpaceStore } from '@/stores'
import { useTheme } from '@/lib/theme-context'
import { useRouter } from 'next/navigation'

interface TopBarProps {
  currentSpace: string
  onSpaceChange: (spaceId: string) => void
  hideSpaceSelector?: boolean
}

function TopBarComponent({ currentSpace, onSpaceChange, hideSpaceSelector = false }: TopBarProps) {
  const userStore = useUserStore()
  const spaceStore = useSpaceStore()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [instanceName, setInstanceName] = useState('Zocalo Instance')

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getGlobalSettings()
        setInstanceName(settings.instanceName)
      } catch (error) {
        console.error('Failed to load instance name:', error)
      }
    }
    loadSettings()
  }, [])

  const handleAddSpace = async () => {
    if (!userStore.user?.id) return
    
    const spaceName = prompt('Enter space name:')
    if (!spaceName) return
    
    try {
      await spaceStore.createSpace({
        name: spaceName,
        userId: userStore.user.id
      })
      console.log('Space created successfully')
    } catch (error) {
      console.error('Failed to create space:', error)
      alert('Failed to create space')
    }
  }

  const handleSignOut = async () => {
    await userStore.signOut()
    router.push('/auth/login')
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const getInitials = (displayName: string) => {
    return displayName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="h-16 border-b bg-card flex items-center justify-between px-6">
      {/* Left side - Account avatar, Instance name and space selector */}
      <div className="flex items-center space-x-4">
        

        <h1 className="text-xl font-semibold text-foreground">{instanceName}</h1>
        
        {/* Space selector - only show if not hidden */}
        {!hideSpaceSelector && (
          <div className="flex items-center space-x-2">
            {/* Space selector dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/20 hover:from-orange-500/15 hover:to-orange-500/10 hover:border-orange-500/30 cursor-pointer transition-all duration-200 shadow-sm">
                  <span className="font-bold text-orange-600">{currentSpace}</span>
                  <ChevronDown className="h-4 w-4 text-orange-500/70" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {spaceStore.spaces.map((space) => (
                  <DropdownMenuItem 
                    key={space.id}
                    onSelect={() => onSpaceChange(space.id)}
                    className="cursor-pointer"
                  >
                    {space.name}
                  </DropdownMenuItem>
                ))}
                {spaceStore.spaces.length === 0 && (
                  <DropdownMenuItem disabled>
                    No spaces available
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onSelect={handleAddSpace}
                  className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/20 rounded-md mx-1 mb-1"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add new space
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Space settings */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Right side - Zocalo branding */}
      <div className="flex items-center">
        {/* Account Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userStore.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                  {getInitials(userStore.displayName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium">{userStore.displayName}</p>
              <p className="text-xs text-muted-foreground">{userStore.userEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme}>
              {theme === 'light' ? (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  Switch to dark mode
                </>
              ) : (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  Switch to light mode
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="text-2xl font-bold text-[rgb(255,113,67)] pl-5">
          zocalo
        </div>
      </div>
    </div>
  )
}

export const TopBar = observer(TopBarComponent) 