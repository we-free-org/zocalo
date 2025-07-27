'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { ChevronDown, Settings, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getGlobalSettings } from '@/lib/supabase/settings'
import { useUserStore, useSpaceStore } from '@/stores'

interface TopBarProps {
  currentSpace: string
  onSpaceChange: (spaceId: string) => void
}

function TopBarComponent({ currentSpace, onSpaceChange }: TopBarProps) {
  const userStore = useUserStore()
  const spaceStore = useSpaceStore()
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

  return (
    <div className="h-16 border-b bg-card flex items-center justify-between px-6">
      {/* Left side - Instance name and space selector */}
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold text-foreground">{instanceName}</h1>
        
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
      </div>

      {/* Right side - Zocalo branding */}
      <div className="flex items-center">
        <div className="text-2xl font-bold text-[rgb(255,113,67)]">
          zocalo
        </div>
      </div>
    </div>
  )
}

export const TopBar = observer(TopBarComponent) 