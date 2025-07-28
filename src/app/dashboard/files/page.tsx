'use client'

import { useState, useEffect, Suspense } from 'react'
import { observer } from 'mobx-react-lite'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthProvider } from '@/components/auth-provider'
import { FilesSidebar, FileContent, File } from '@/components/files'
import { useUserStore, useSpaceStore } from '@/stores'
import { Loader2 } from 'lucide-react'

const FilesContent = observer(() => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const userStore = useUserStore()
  const spaceStore = useSpaceStore()

  // Reset selected file when space changes
  useEffect(() => {
    setSelectedFile(null)
  }, [spaceStore.currentSpaceId])

  if (!userStore.user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Files Sidebar */}
      <div className="min-w-[384px] border-r bg-muted/30">
        <FilesSidebar 
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <FileContent 
          file={selectedFile}
          onFileUpdate={setSelectedFile}
        />
      </div>
    </div>
  )
})

const FilesPage = observer(() => {
  return (
    <DashboardLayout>
      <AuthProvider>
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }>
          <FilesContent />
        </Suspense>
      </AuthProvider>
    </DashboardLayout>
  )
})

export default FilesPage 