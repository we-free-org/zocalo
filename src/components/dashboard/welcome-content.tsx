'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Hash, Calendar, FileText, Vote, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getGlobalSettings } from '@/lib/supabase/settings'

interface WelcomeContentProps {
  currentSpace?: string
  onSectionChange?: (section: string) => void
}

export function WelcomeContent({ 
  currentSpace = 'General', 
  onSectionChange = () => {} 
}: WelcomeContentProps) {
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

  const features = [
    {
      title: 'Invite Team Members',
      description: 'Build your community by inviting colleagues and collaborators to join your space.',
      icon: Users,
      action: 'Manage Members',
      section: 'members',
      color: 'text-slate-600'
    },
    {
      title: 'Create Channels',
      description: 'Organize discussions by topic with dedicated channels for different projects or interests.',
      icon: Hash,
      action: 'Browse Channels',
      section: 'channels',
      color: 'text-green-600'
    },
    {
      title: 'Schedule Events',
      description: 'Plan meetings, workshops, and important dates to keep everyone aligned and informed.',
      icon: Calendar,
      action: 'View Calendar',
      section: 'events',
      color: 'text-purple-600'
    },
    {
      title: 'Share Files',
      description: 'Upload and organize documents, images, and resources for easy team access.',
      icon: FileText,
      action: 'Upload Files',
      section: 'files',
      color: 'text-red-600'
    },
    {
      title: 'Create Votes',
      description: 'Make decisions together by setting up polls and votes on important topics.',
      icon: Vote,
      action: 'Start Voting',
      section: 'vote',
      color: 'text-blue-600'
    }
  ]

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Welcome header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to {instanceName}
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            You're currently in the <span className="font-semibold text-[rgb(255,113,67)]">{currentSpace}</span> space
          </p>
          <p className="text-lg text-muted-foreground">
            Start building your community and collaborating with your team
          </p>
        </div>

        {/* Quick actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Get Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title} className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={cn(
                        'p-2 rounded-lg bg-muted',
                        feature.color
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button 
                      variant="outline" 
                      className="w-full group-hover:bg-[rgb(255,113,67)] group-hover:text-white group-hover:border-[rgb(255,113,67)] transition-colors"
                      onClick={() => onSectionChange(feature.section)}
                    >
                      {feature.action}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Tips section */}
        <Card className="bg-gradient-to-r from-[rgb(255,113,67)]/10 to-[rgb(255,113,67)]/5 border-[rgb(255,113,67)]/20">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center">
              <Plus className="mr-2 h-5 w-5 text-[rgb(255,113,67)]" />
              Pro Tips for Building Your Community
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Start with Clear Channels</h4>
                <p className="text-sm text-muted-foreground">
                  Create specific channels like #general, #announcements, and project-specific channels to keep conversations organized.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Set Communication Guidelines</h4>
                <p className="text-sm text-muted-foreground">
                  Use votes to establish community rules and communication standards that everyone agrees on.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Regular Check-ins</h4>
                <p className="text-sm text-muted-foreground">
                  Schedule weekly team events and use the calendar to keep everyone informed about important dates.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Knowledge Sharing</h4>
                <p className="text-sm text-muted-foreground">
                  Use the files section to create a shared knowledge base with important documents and resources.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
} 