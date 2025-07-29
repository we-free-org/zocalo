// Import Entity from the main entities file
import { Entity } from '@/lib/entities'

// Projects App Theme
export const PROJECTS_HIGHLIGHT_COLOR = '#3b82f6' // Blue-500

// Project App Entity Types
export interface ProjectEntityData {
  title: string
  description?: string
  status: 'planning' | 'active' | 'completed' | 'archived'
  color?: string
  deadline?: string
  team_members?: string[]
  settings?: {
    allow_comments?: boolean
    allow_attachments?: boolean
    visibility?: 'private' | 'team' | 'public'
  }
}

export interface ProjectListEntityData {
  title: string
  description?: string
  position: number
  project_id: string
  color?: string
  list_type: 'todo' | 'in_progress' | 'review' | 'done' | 'custom'
  settings?: {
    task_limit?: number
    auto_archive?: boolean
    collapsed?: boolean
  }
}

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

export interface TaskAttachment {
  id: string
  name: string
  url: string
  type: string
}

export interface ProjectTaskEntityData {
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee_id?: string
  assignee_name?: string
  due_date?: string
  start_date?: string
  estimated_hours?: number
  actual_hours?: number
  position: number
  project_id: string
  list_id?: string
  labels?: string[]
  checklist?: ChecklistItem[]
  attachments?: TaskAttachment[]
}

// Extended entity types with parsed content
export interface ProjectEntity extends Entity {
  parsedContent: ProjectEntityData
}

export interface ProjectListEntity extends Entity {
  parsedContent: ProjectListEntityData
}

export interface ProjectTaskEntity extends Entity {
  parsedContent: ProjectTaskEntityData
}

// UI Component Props
export interface KanbanBoardProps {
  projectId: string
  spaceId: string
}

export interface KanbanListProps {
  list: ProjectListEntity
  tasks: ProjectTaskEntity[]
  onTaskCreate: (listId: string, title: string) => void
  onTaskUpdate: (taskId: string, updates: Partial<ProjectTaskEntityData>) => void
  onTaskClick: (task: ProjectTaskEntity) => void
  onListUpdate: (listId: string, updates: Partial<ProjectListEntityData>) => void
}

export interface TaskCardProps {
  task: ProjectTaskEntity
  onUpdate: (updates: Partial<ProjectTaskEntityData>) => void
  onTaskClick?: (task: ProjectTaskEntity) => void
  isDragOverlay?: boolean
}

export interface CreateProjectFormData {
  title: string
  description?: string
  color?: string
  deadline?: string
  team_members?: string[]
}

export interface CreateListFormData {
  title: string
  description?: string
  color?: string
  list_type: 'todo' | 'in_progress' | 'review' | 'done' | 'custom'
}

export interface CreateTaskFormData {
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assignee_id?: string
  due_date?: string
  labels?: string[]
} 