'use client'


import { Clock, MessageSquare, Paperclip, MoreVertical, User, Flag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useSortable,
} from '@dnd-kit/sortable'
import {
  CSS,
} from '@dnd-kit/utilities'
import { TaskCardProps, ProjectTaskEntityData } from '../types'

export function TaskCard({ task, onUpdate, onTaskClick, isDragOverlay }: TaskCardProps) {
  // Sortable setup - only if not in drag overlay
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    disabled: isDragOverlay
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800', 
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  }

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    review: 'bg-purple-100 text-purple-800',
    done: 'bg-green-100 text-green-800',
    blocked: 'bg-red-100 text-red-800'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const handleStatusChange = (newStatus: ProjectTaskEntityData['status']) => {
    onUpdate({ status: newStatus })
  }

  const handlePriorityChange = (newPriority: ProjectTaskEntityData['priority']) => {
    onUpdate({ priority: newPriority })
  }

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer hover:shadow-md transition-shadow ${isDragging ? 'opacity-50' : ''} ${isDragOverlay ? 'shadow-lg' : ''}`}
      {...attributes}
      {...listeners}
      onClick={() => onTaskClick?.(task)}
    >
      <CardContent className="p-3">
        {/* Task Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-medium line-clamp-2 flex-1">
            {task.title}
          </h4>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 flex-shrink-0"
                onClick={(e) => e.stopPropagation()} // Prevent card click when opening menu
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange('todo')}>
                Mark as To Do
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
                Mark as In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('review')}>
                Mark as Review
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('done')}>
                Mark as Done
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('blocked')}>
                Mark as Blocked
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Task Description */}
        {task.parsedContent.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {task.parsedContent.description}
          </p>
        )}

        {/* Labels */}
        {task.parsedContent.labels && task.parsedContent.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.parsedContent.labels.slice(0, 3).map((label) => (
              <Badge key={label} variant="secondary" className="text-xs px-1 py-0">
                {label}
              </Badge>
            ))}
            {task.parsedContent.labels.length > 3 && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                +{task.parsedContent.labels.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Status and Priority */}
        <div className="flex gap-1 mb-3">
          <Badge 
            variant="secondary" 
            className={`text-xs px-2 py-0 ${statusColors[task.parsedContent.status]}`}
          >
            {task.parsedContent.status.replace('_', ' ')}
          </Badge>
          
          <Badge 
            variant="secondary"
            className={`text-xs px-2 py-0 ${priorityColors[task.parsedContent.priority]}`}
          >
            <Flag className="w-3 h-3 mr-1" />
            {task.parsedContent.priority}
          </Badge>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {/* Due Date */}
            {task.parsedContent.due_date && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatDate(task.parsedContent.due_date)}</span>
              </div>
            )}

            {/* Assignee */}
            {task.parsedContent.assignee_name && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span className="truncate max-w-[80px]">
                  {task.parsedContent.assignee_name}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Comments */}
            {task.thread_count > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                <span>{task.thread_count}</span>
              </div>
            )}

            {/* Attachments */}
            {task.parsedContent.attachments && task.parsedContent.attachments.length > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                <span>{task.parsedContent.attachments.length}</span>
              </div>
            )}

            {/* Checklist Progress */}
            {task.parsedContent.checklist && task.parsedContent.checklist.length > 0 && (
              <div className="flex items-center gap-1">
                <span>
                  {task.parsedContent.checklist.filter(item => item.completed).length}/{task.parsedContent.checklist.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 