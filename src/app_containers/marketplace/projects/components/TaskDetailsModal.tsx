'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, User, Tag, Plus, X, Save, Flag, MessageSquare, Paperclip, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Comments } from '@/components/comments/comments'
import { ProjectTaskEntity, ProjectTaskEntityData, PROJECTS_HIGHLIGHT_COLOR } from '../types'
import { useStore } from '@/stores'

interface TaskDetailsModalProps {
  task: ProjectTaskEntity | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<ProjectTaskEntityData>) => void
  onCreateSubtask: (parentTaskId: string, title: string) => void
  subtasks: ProjectTaskEntity[]
  onSubtaskClick: (subtask: ProjectTaskEntity) => void
}

export function TaskDetailsModal({ 
  task, 
  isOpen, 
  onClose, 
  onUpdate, 
  onCreateSubtask,
  subtasks,
  onSubtaskClick
}: TaskDetailsModalProps) {
  const { userStore } = useStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editedTask, setEditedTask] = useState<Partial<ProjectTaskEntityData>>({})
  const [newLabel, setNewLabel] = useState('')
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')

  useEffect(() => {
    if (task) {
      setEditedTask(task.parsedContent)
      setIsEditing(false)
    }
  }, [task])

  if (!task) return null

  const handleSave = () => {
    onUpdate(task.id, editedTask)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedTask(task.parsedContent)
    setIsEditing(false)
  }

  const handleAddLabel = () => {
    if (newLabel.trim()) {
      const currentLabels = editedTask.labels || []
      setEditedTask(prev => ({
        ...prev,
        labels: [...currentLabels, newLabel.trim()]
      }))
      setNewLabel('')
    }
  }

  const handleRemoveLabel = (labelToRemove: string) => {
    setEditedTask(prev => ({
      ...prev,
      labels: prev.labels?.filter(label => label !== labelToRemove)
    }))
  }

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      const currentChecklist = editedTask.checklist || []
      setEditedTask(prev => ({
        ...prev,
        checklist: [...currentChecklist, {
          id: Date.now().toString(),
          text: newChecklistItem.trim(),
          completed: false
        }]
      }))
      setNewChecklistItem('')
    }
  }

  const handleToggleChecklistItem = (itemId: string) => {
    setEditedTask(prev => ({
      ...prev,
      checklist: prev.checklist?.map(item => 
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    }))
  }

  const handleRemoveChecklistItem = (itemId: string) => {
    setEditedTask(prev => ({
      ...prev,
      checklist: prev.checklist?.filter(item => item.id !== itemId)
    }))
  }

  const handleCreateSubtask = () => {
    if (newSubtaskTitle.trim()) {
      onCreateSubtask(task.id, newSubtaskTitle.trim())
      setNewSubtaskTitle('')
    }
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none sm:max-w-none h-[80vh] max-h-none overflow-hidden p-6 flex flex-col" style={{ width: '80vw', height: '80vh' }}>
        <DialogHeader className="w-full pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex-1 mr-4">
              {isEditing ? (
                <Input
                  value={editedTask.title || ''}
                  onChange={(e) => setEditedTask(prev => ({ ...prev, title: e.target.value }))}
                  className="text-lg font-semibold"
                />
              ) : (
                <span className="text-lg font-semibold">{task.title}</span>
              )}
            </DialogTitle>
            
            <div className="flex items-center gap-3 mr-7">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} style={{ backgroundColor: PROJECTS_HIGHLIGHT_COLOR }}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-6 gap-6 flex-1 min-h-0">
          {/* Main Content */}
          <div className="col-span-3 space-y-4 overflow-y-auto">
            {/* Description */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Description</Label>
              {isEditing ? (
                <Textarea
                  value={editedTask.description || ''}
                  onChange={(e) => setEditedTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add a description..."
                  rows={4}
                />
              ) : (
                <div className="text-sm text-muted-foreground border rounded-md p-3 min-h-[100px]">
                  {task.parsedContent.description || 'No description'}
                </div>
              )}
            </div>

            {/* Checklist */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Checklist</Label>
              <div className="space-y-2">
                {(isEditing ? editedTask.checklist : task.parsedContent.checklist)?.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => {
                        handleToggleChecklistItem(item.id)
                        if (!isEditing) {
                          // Auto-save checklist changes even when not in edit mode
                          const updatedChecklist = task.parsedContent.checklist?.map(checkItem => 
                            checkItem.id === item.id ? { ...checkItem, completed: !checkItem.completed } : checkItem
                          )
                          onUpdate(task.id, { checklist: updatedChecklist })
                        }
                      }}
                    />
                    <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.text}
                    </span>
                    {isEditing && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveChecklistItem(item.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {isEditing && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add checklist item..."
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                    />
                    <Button size="sm" onClick={handleAddChecklistItem}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Subtasks */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Subtasks</Label>
              <div className="space-y-2">
                {subtasks.map((subtask) => (
                  <div 
                    key={subtask.id} 
                    className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSubtaskClick(subtask)}
                  >
                    <span className="flex-1 text-sm">{subtask.title}</span>
                    <Badge variant="secondary" className={`text-xs ${statusColors[subtask.parsedContent.status]}`}>
                      {subtask.parsedContent.status}
                    </Badge>
                  </div>
                ))}
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Add subtask..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSubtask()}
                  />
                  <Button size="sm" onClick={handleCreateSubtask} style={{ backgroundColor: PROJECTS_HIGHLIGHT_COLOR }}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-3 col-span-1 overflow-y-auto ml-5">
            {/* Status & Priority */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">STATUS</Label>
                {isEditing ? (
                  <Select
                    value={editedTask.status}
                    onValueChange={(value: any) => setEditedTask(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={`mt-1 ${statusColors[task.parsedContent.status]}`}>
                    {task.parsedContent.status.replace('_', ' ')}
                  </Badge>
                )}
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">PRIORITY</Label>
                {isEditing ? (
                  <Select
                    value={editedTask.priority}
                    onValueChange={(value: any) => setEditedTask(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={`mt-1 ${priorityColors[task.parsedContent.priority]}`}>
                    <Flag className="w-3 h-3 mr-1" />
                    {task.parsedContent.priority}
                  </Badge>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">DUE DATE</Label>
                {isEditing ? (
                  <Input
                    type="datetime-local"
                    value={editedTask.due_date ? new Date(editedTask.due_date).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditedTask(prev => ({ ...prev, due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                    className="mt-1"
                  />
                ) : task.parsedContent.due_date ? (
                  <div className="mt-1 text-sm flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(task.parsedContent.due_date).toLocaleDateString()}
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-muted-foreground">No due date</div>
                )}
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">START DATE</Label>
                {isEditing ? (
                  <Input
                    type="datetime-local"
                    value={editedTask.start_date ? new Date(editedTask.start_date).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditedTask(prev => ({ ...prev, start_date: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                    className="mt-1"
                  />
                ) : task.parsedContent.start_date ? (
                  <div className="mt-1 text-sm flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(task.parsedContent.start_date).toLocaleDateString()}
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-muted-foreground">No start date</div>
                )}
              </div>
            </div>

            {/* Assignee */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground">ASSIGNEE</Label>
              {isEditing ? (
                <Input
                  value={editedTask.assignee_name || ''}
                  onChange={(e) => setEditedTask(prev => ({ ...prev, assignee_name: e.target.value }))}
                  placeholder="Assign to..."
                  className="mt-1"
                />
              ) : task.parsedContent.assignee_name ? (
                <div className="mt-1 text-sm flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {task.parsedContent.assignee_name}
                </div>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">Unassigned</div>
              )}
            </div>

            {/* Labels */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground">LABELS</Label>
              <div className="mt-1 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {(isEditing ? editedTask.labels : task.parsedContent.labels)?.map((label) => (
                    <Badge key={label} variant="secondary" className="text-xs">
                      {label}
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveLabel(label)}
                          className="ml-1 text-xs hover:text-destructive"
                        >
                          <X className="w-2 h-2" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                
                {isEditing && (
                  <div className="flex gap-1">
                    <Input
                      placeholder="Add label..."
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                      className="text-xs"
                    />
                    <Button size="sm" onClick={handleAddLabel}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Summary */}
            <div className="pt-4 border-t">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" />
                  <span>{task.thread_count} comments</span>
                </div>
                {task.parsedContent.attachments && task.parsedContent.attachments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-3 h-3" />
                    <span>{task.parsedContent.attachments.length} attachments</span>
                  </div>
                )}
                <div>Created {new Date(task.created_at).toLocaleDateString()}</div>
                {task.is_edited && (
                  <div>Last edited {new Date(task.edited_at!).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          </div>

          {/* Comments Column */}
          <div className="col-span-2 border-l pl-6 flex flex-col min-h-0">
            <Comments 
              parentId={task.id} 
              parentType="project_task" 
              className="flex-1 min-h-0"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 