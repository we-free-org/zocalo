'use client'

import { useState, ReactNode, cloneElement, isValidElement } from 'react'
import { observer } from 'mobx-react-lite'
import { TopBar } from '@/components/dashboard/top-bar'
import { Sidebar } from '@/components/dashboard/sidebar'
import { useUserStore, useSpaceStore } from '@/stores'

interface DashboardLayoutProps {
  children: ReactNode
  defaultSection?: string
  defaultSpace?: string
}

function DashboardLayoutComponent({ 
  children, 
  defaultSection = 'home',
  defaultSpace = 'General'
}: DashboardLayoutProps) {
  const userStore = useUserStore()
  const spaceStore = useSpaceStore()
  const [currentSection, setCurrentSection] = useState(defaultSection)

  console.log('DashboardLayout: Current state:', {
    isAuthenticated: userStore.isAuthenticated,
    hasProfile: userStore.hasProfile,
    hasSpaces: spaceStore.hasSpaces,
    spacesCount: spaceStore.spaces.length,
    currentSpaceName: spaceStore.currentSpaceName
  })

  const handleSpaceChange = (spaceId: string) => {
    spaceStore.setCurrentSpace(spaceId)
  }

  const handleSectionChange = (section: string) => {
    setCurrentSection(section)
  }

  // Clone children and pass props if they need them
  const enhancedChildren = isValidElement(children) 
    ? cloneElement(children as any, { 
        currentSpace: spaceStore.currentSpaceName, 
        currentSection,
        onSectionChange: handleSectionChange 
      })
    : children

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar - Full height */}
      <Sidebar 
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
      />
      
      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <TopBar 
          currentSpace={spaceStore.currentSpaceName}
          onSpaceChange={handleSpaceChange}
        />
        
        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {enhancedChildren}
        </main>
      </div>
    </div>
  )
}

export const DashboardLayout = observer(DashboardLayoutComponent) 