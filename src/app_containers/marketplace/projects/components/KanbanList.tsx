'use client'

import { useState } from 'react'
import { Plus, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { TaskCard } from './TaskCard'
import { KanbanListProps, PROJECTS_HIGHLIGHT_COLOR } from '../types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function KanbanList({ 
  list, 
  tasks, 
  onTaskCreate, 
  onTaskUpdate, 
  onTaskClick,
  onListUpdate
}: KanbanListProps) {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isEditingList, setIsEditingList] = useState(false)
  const [editListFormData, setEditListFormData] = useState({
    title: list.title,
    description: list.parsedContent.description || '',
    color: list.parsedContent.color || '#f3f4f6',
    list_type: list.parsedContent.list_type
  })

  // Sortable setup for the list itself
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onTaskCreate(list.id, newTaskTitle.trim())
      setNewTaskTitle('')
      setIsAddingTask(false)
    }
  }

  const handleCancelAdd = () => {
    setNewTaskTitle('')
    setIsAddingTask(false)
  }

  const handleEditList = () => {
    const updates = {
      title: editListFormData.title,
      description: editListFormData.description,
      color: editListFormData.color,
      list_type: editListFormData.list_type
    }
    onListUpdate(list.id, updates)
    setIsEditingList(false)
  }

  const handleCancelEditList = () => {
    setEditListFormData({
      title: list.title,
      description: list.parsedContent.description || '',
      color: list.parsedContent.color || '#f3f4f6',
      list_type: list.parsedContent.list_type
    })
    setIsEditingList(false)
  }

  const listTypeColors = {
    todo: '#fef3c7',
    in_progress: '#dbeafe', 
    review: '#fed7e2',
    done: '#d1fae5',
    custom: '#f3f4f6'
  }

  const backgroundColor = list.parsedContent.color || listTypeColors[list.parsedContent.list_type] || listTypeColors.custom

  return (
    <div ref={setNodeRef} style={style} className="w-80 flex-shrink-0">
      <Card 
        className={`h-full flex flex-col transition-opacity ${isDragging ? 'opacity-50' : ''}`} 
        style={{ backgroundColor }}
      >
        {/* List Header - This is the drag handle */}
        <CardHeader 
          className="pb-3 cursor-move" 
          {...attributes} 
          {...listeners}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">{list.title}</h3>
              <span className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded">
                {tasks.length}
              </span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditingList(true)}>
                  Edit List
                </DropdownMenuItem>
                <DropdownMenuItem>Archive List</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Delete List</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {list.parsedContent.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {list.parsedContent.description}
            </p>
          )}
        </CardHeader>

        {/* Tasks - Sortable context for tasks within this list */}
        <CardContent className="flex-1 flex flex-col gap-2 p-3 pt-0">
          <div className="space-y-2 flex-1">
            <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
              {tasks
                .sort((a, b) => (a.parsedContent.position || 0) - (b.parsedContent.position || 0))
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdate={(updates) => onTaskUpdate(task.id, updates)}
                    onTaskClick={onTaskClick}
                  />
                ))}
            </SortableContext>
          </div>

          {/* Add Task */}
          {isAddingTask ? (
            <div className="space-y-2 mt-2">
              <Input
                placeholder="Enter task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTask()
                  } else if (e.key === 'Escape') {
                    handleCancelAdd()
                  }
                }}
                autoFocus
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
                  Add Task
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelAdd}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start gap-2 text-muted-foreground hover:text-foreground mt-2"
              onClick={() => setIsAddingTask(true)}
            >
              <Plus className="w-4 h-4" />
              Add a task
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Edit List Dialog */}
      <Dialog open={isEditingList} onOpenChange={setIsEditingList}>
        <DialogContent className="sm:max-w-[50%] max-w-md">
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-list-title">List Name</Label>
              <Input
                id="edit-list-title"
                placeholder="Enter list name..."
                value={editListFormData.title}
                onChange={(e) => setEditListFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-list-description">Description (optional)</Label>
              <Input
                id="edit-list-description"
                placeholder="Enter list description..."
                value={editListFormData.description}
                onChange={(e) => setEditListFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-list-type">List Type</Label>
              <Select 
                value={editListFormData.list_type} 
                onValueChange={(value) => setEditListFormData(prev => ({ ...prev, list_type: value as 'todo' | 'in_progress' | 'review' | 'done' | 'custom' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-list-color">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="edit-list-color"
                  value={editListFormData.color}
                  onChange={(e) => setEditListFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-8 h-8 rounded border"
                />
                <span className="text-sm text-muted-foreground">{editListFormData.color}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelEditList}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditList}
              disabled={!editListFormData.title.trim()}
              style={{ backgroundColor: PROJECTS_HIGHLIGHT_COLOR }}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 