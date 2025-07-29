'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Plus, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/stores'
import { KanbanBoard } from './KanbanBoard'
import { ProjectEntity, CreateProjectFormData, PROJECTS_HIGHLIGHT_COLOR } from '../types'
import { getProjectsInSpace, createProject } from '../schemas'

interface ProjectsMainProps {
  currentSpace?: string
  currentSection?: string
  onSectionChange?: (section: string) => void
}

export const ProjectsMain = observer(({ currentSpace, currentSection, onSectionChange }: ProjectsMainProps = {}) => {
  const { spaceStore, userStore } = useStore()
  const [projects, setProjects] = useState<ProjectEntity[]>([])
  const [selectedProject, setSelectedProject] = useState<ProjectEntity | null>(null)
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createFormData, setCreateFormData] = useState<CreateProjectFormData>({
    title: '',
    description: '',
    color: '#3b82f6'
  })

  const activeSpace = spaceStore.currentSpace
  const currentUser = userStore.user

  useEffect(() => {
    if (activeSpace) {
      loadProjects()
    }
  }, [activeSpace])

  const loadProjects = async () => {
    if (!activeSpace) return
    
    try {
      setLoading(true)
              const projectsData = await getProjectsInSpace(activeSpace!.id)
      setProjects(projectsData)
      
      // Select first project if none selected
      if (projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0])
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!activeSpace || !currentUser || !createFormData.title.trim()) return

    try {
      const projectData = {
        title: createFormData.title.trim(),
        description: createFormData.description?.trim(),
        status: 'active' as const,
        color: createFormData.color,
        settings: {
          allow_comments: true,
          allow_attachments: true,
          visibility: 'team' as const
        }
      }

      const newProject = await createProject(activeSpace!.id, currentUser.id, projectData)
      if (newProject) {
        const projectEntity: ProjectEntity = {
          ...newProject,
          parsedContent: projectData
        }
        
        setProjects(prev => [projectEntity, ...prev])
        setSelectedProject(projectEntity)
        setCreateDialogOpen(false)
        setCreateFormData({
          title: '',
          description: '',
          color: '#3b82f6'
        })
      }
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">Projects</h1>
            
            {/* Project Selector */}
            {projects.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    {selectedProject ? (
                      <>
                        {selectedProject.parsedContent.color && (
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: selectedProject.parsedContent.color }}
                          />
                        )}
                        <span className="max-w-[200px] truncate">
                          {selectedProject.title}
                        </span>
                      </>
                    ) : (
                      'Select Project'
                    )}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {projects.map((project) => (
                    <DropdownMenuItem
                      key={project.id}
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => setSelectedProject(project)}
                    >
                      {project.parsedContent.color && (
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: project.parsedContent.color }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{project.title}</div>
                        {project.parsedContent.description && (
                          <div className="text-sm text-muted-foreground truncate">
                            {project.parsedContent.description}
                          </div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Create Project Button */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="gap-2"
                style={{ backgroundColor: PROJECTS_HIGHLIGHT_COLOR }}
              >
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[50%] max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Project Name</Label>
                  <Input
                    id="title"
                    placeholder="Enter project name..."
                    value={createFormData.title}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief project description..."
                    value={createFormData.description}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="color"
                      value={createFormData.color}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-8 h-8 rounded border"
                    />
                    <span className="text-sm text-muted-foreground">{createFormData.color}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateProject}
                  disabled={!createFormData.title.trim()}
                  style={{ backgroundColor: PROJECTS_HIGHLIGHT_COLOR }}
                >
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {projects.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-muted-foreground text-lg">No projects yet</div>
              <p className="text-sm text-muted-foreground">
                Create your first project to start organizing tasks with kanban boards.
              </p>
              <Button 
                onClick={() => setCreateDialogOpen(true)} 
                className="gap-2"
                style={{ backgroundColor: PROJECTS_HIGHLIGHT_COLOR }}
              >
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            </div>
          </div>
        ) : selectedProject ? (
          <KanbanBoard 
            projectId={selectedProject.id} 
            spaceId={activeSpace?.id || ''} 
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Select a project to view the kanban board</p>
          </div>
        )}
      </div>
    </div>
  )
}) 