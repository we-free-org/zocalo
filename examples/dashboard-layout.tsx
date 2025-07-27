"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  BookOpen,
  GalleryVerticalEnd,
  PieChart,
  Settings2,
  Users,
  Shield,
  GraduationCap,
  Wrench,
  ChevronRight,
  Check,
  Clock,
  Circle,
  Home,
  LogOut,
  Bot,
} from "lucide-react"
import { useUserStore } from "@/stores"
import { observer } from "mobx-react-lite"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ChatSidebarTrigger, ChatSidebarProvider, ChatSidebar } from "@/components/chat-sidebar"

// Type definitions
type StatusType = "completed" | "pending" | "not-started"

interface NestedItem {
  title: string
  url: string
  status: StatusType
}

interface AssessmentItem {
  title: string
  url: string
  status: StatusType
  items?: NestedItem[]
}

interface SimpleNavItem {
  title: string
  url: string
}

interface MainNavItem {
  title: string
  url: string
  icon: React.ComponentType
  isActive?: boolean
  items: AssessmentItem[] | SimpleNavItem[]
}

interface NavSecondaryItem {
  title: string
  url: string
  icon: React.ComponentType
}

// Data for the sidebar
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  organization: {
    name: "Acme Corp", // This will be overridden by actual data
    plan: "Enterprise",
    logo: GalleryVerticalEnd,
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: false,
      items: [] as SimpleNavItem[],
    },
    {
      title: "Assessment",
      url: "/assessment",
      icon: PieChart,
      isActive: true,
      items: [] as SimpleNavItem[],
    },
    {
      title: "Experts",
      url: "/experts",
      icon: Bot,
      isActive: false,
      items: [] as SimpleNavItem[],
    },
    {
      title: "Tools",
      url: "/tools",
      icon: Wrench,
      items: [
        {
          title: "Product Portfolio",
          url: "/tools/product-portfolio",
        },
        {
          title: "Price Benchmarking",
          url: "/tools/price-benchmarking",
        },
        {
          title: "Cost Calculator",
          url: "/tools/cost-calculator",
        },
      ] as SimpleNavItem[],
    },
    {
      title: "Academy",
      url: "/academy",
      icon: GraduationCap,
      items: [] as SimpleNavItem[],
    }
    
  ] as MainNavItem[],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
    },
  ] as NavSecondaryItem[],
}

// Helper function to get status icon
const getStatusIcon = (status: StatusType) => {
  switch (status) {
    case "completed":
      return <Check className="h-4 w-4 text-copailot-electric stroke-[1]" />
    case "pending":
      return <Clock className="h-4 w-4 text-copailot-lilac stroke-[1]" />
    case "not-started":
    default:
      return <Circle className="h-3 w-3 text-copailot-navy/50 stroke-[0.5]" />
  }
}

// Helper function for nested status icons (same size as second level now)


// Type guard to check if an item is an AssessmentItem
const isAssessmentItem = (item: AssessmentItem | SimpleNavItem): item is AssessmentItem => {
  return 'status' in item
}

interface DashboardLayoutProps {
  children: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
  hideSidebar?: boolean
  sidebarMinimized?: boolean
}

export const DashboardLayout = observer(({ children, breadcrumbs = [], hideSidebar = false, sidebarMinimized = false }: DashboardLayoutProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const userStore = useUserStore()

  const handleLogout = async () => {
    try {
      await userStore.signOut()
      // Manually redirect to login
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Note: Individual pages should handle their own authentication checks
  // DashboardLayout should not block rendering here

  // Generate user initials for avatar fallback
  const getUserInitials = () => {
    if (userStore.profile?.firstName && userStore.profile?.lastName) {
      return `${userStore.profile.firstName[0]}${userStore.profile.lastName[0]}`.toUpperCase()
    }
    if (userStore.profile?.firstName) {
      return userStore.profile.firstName[0].toUpperCase()
    }
    if (userStore.user?.email) {
      return userStore.user.email[0].toUpperCase()
    }
    return "U"
  }

  // Get display name
  const getDisplayName = () => {
    if (userStore.fullName) {
      return userStore.fullName
    }
    if (userStore.profile?.firstName) {
      return userStore.profile.firstName
    }
    return "User"
  }

  // Function to determine if a menu item is active based on URL
  const isActiveItem = (itemTitle: string) => {
    const segment = pathname.split('/')[1] // Get first URL segment
    switch (itemTitle.toLowerCase()) {
      case 'assessment':
        return segment === 'assessment'
      case 'experts':
        return segment === 'experts'
      case 'tools':
        return segment === 'tools'
      case 'academy':
        return segment === 'academy'
      case 'settings':
        return segment === 'settings'
      case 'admin':
        return segment === 'admin'
      default:
        return segment === 'dashboard' && itemTitle.toLowerCase() === 'dashboard'
    }
  }

  // Get navigation items based on user role
  const getNavSecondary = (): NavSecondaryItem[] => {
    const baseNav = [
      {
        title: "Settings",
        url: "/settings",
        icon: Settings2,
      },
    ]

    // Add Admin menu for admins and super admins
    if (userStore.profile?.systemRole === 'admin' || userStore.profile?.systemRole === 'super_admin') {
      baseNav.push({
        title: "Admin",
        url: "/admin",
        icon: Shield,
      })
    }

    return baseNav
  }

  // Function to determine if a menu item should be expanded (has active children)
  const shouldExpand = (itemTitle: string) => {
    return isActiveItem(itemTitle)
  }

  return (
    <ChatSidebarProvider>
      <SidebarProvider defaultOpen={!sidebarMinimized}>
        {!hideSidebar && (
          <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <a href="#">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-copailot-indigo to-copailot-navy text-white shadow-lg">
                      <data.organization.logo className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-copailot-navy">
                        {userStore.organization?.name || data.organization.name}
                      </span>
                      <span className="truncate text-xs text-copailot-indigo font-medium">
                        {data.organization.plan}
                      </span>
                    </div>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
              <SidebarMenu>
                {data.navMain.map((item) => {
                  const isActive = isActiveItem(item.title)
                  const shouldBeExpanded = shouldExpand(item.title)
                  
                  // If item has no sub-items, render as simple navigation link
                  if (!item.items || item.items.length === 0) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton tooltip={item.title} isActive={isActive} asChild>
                          <a href={item.url}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  }
                  
                  // Render as collapsible item with sub-items
                  return (
                    <Collapsible
                      key={item.title}
                      asChild
                      defaultOpen={shouldBeExpanded}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => (
                            <div key={subItem.title}>
                              {isAssessmentItem(subItem) && subItem.items ? (
                                // This is a parent item with sub-items (like Management, Strategy, Operations)
                                <Collapsible asChild className="group/sub-collapsible">
                                  <SidebarMenuSubItem>
                                    <CollapsibleTrigger asChild>
                                      <SidebarMenuSubButton >
                                        {getStatusIcon(subItem.status)}
                                        <span>{subItem.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                      </SidebarMenuSubButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <div className="ml-4 border-l border-sidebar-border pl-4 space-y-1">
                                        {subItem.items.map((nestedItem: NestedItem) => (
                                          <div key={nestedItem.title} className="flex items-center gap-2 py-1.5">
                                            {getStatusIcon(nestedItem.status)}
                                            <a 
                                              href={nestedItem.url}
                                              className="text-sm text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
                                            >
                                              {nestedItem.title}
                                            </a>
                                          </div>
                                        ))}
                                      </div>
                                    </CollapsibleContent>
                                  </SidebarMenuSubItem>
                                </Collapsible>
                              ) : isAssessmentItem(subItem) ? (
                                // This is a simple assessment item (like General Information)
                                <SidebarMenuSubItem>
                                  <SidebarMenuSubButton asChild className="gap-2">
                                    <a href={subItem.url}>
                                      {getStatusIcon(subItem.status)}
                                      <span>{subItem.title}</span>
                                    </a>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ) : (
                                // This is a simple nav item (for Tools, Tutorials, Academy)
                                <SidebarMenuSubItem>
                                  <SidebarMenuSubButton asChild>
                                    <a href={subItem.url}>
                                      <span>{subItem.title}</span>
                                    </a>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )}
                            </div>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarMenu>
                {getNavSecondary().map((item) => {
                  const isActive = isActiveItem(item.title)
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton tooltip={item.title} isActive={isActive} asChild>
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage
                          src={userStore.profile?.avatarUrl || undefined}
                          alt={getDisplayName()}
                        />
                        <AvatarFallback className="rounded-lg">{getUserInitials()}</AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {getDisplayName()}
                        </span>
                        <span className="truncate text-xs">
                          {userStore.user?.email}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                    side="bottom"
                    align="end"
                    sideOffset={4}
                  >
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="h-8 w-8 rounded-lg">
                          <AvatarImage
                            src={userStore.profile?.avatarUrl || undefined}
                            alt={getDisplayName()}
                          />
                          <AvatarFallback className="rounded-lg">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">
                            {getDisplayName()}
                          </span>
                          <span className="truncate text-xs">
                            {userStore.user?.email}
                          </span>
                          {userStore.organization?.name && (
                            <span className="truncate text-xs text-muted-foreground">
                              {userStore.organization.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Settings
                        <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                      <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        )}
        
        <div className="flex flex-1 min-h-screen">
          <SidebarInset className="flex-1">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-white border-b border-copailot-indigo/10">
              <div className="flex items-center gap-2 px-4">
                {!hideSidebar && (
                  <>
                    <SidebarTrigger className="-ml-1 hover:bg-copailot-indigo/10 hover:text-copailot-indigo transition-colors" />
                    <Separator orientation="vertical" className="mr-2 h-4 bg-copailot-indigo/20" />
                  </>
                )}
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="/dashboard" className="text-copailot-navy hover:text-copailot-indigo transition-colors">
                        Dashboard
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {breadcrumbs.map((breadcrumb, index) => (
                      <React.Fragment key={index}>
                        <BreadcrumbSeparator className="hidden md:block text-copailot-indigo/40" />
                        <BreadcrumbItem>
                          {breadcrumb.href ? (
                            <BreadcrumbLink href={breadcrumb.href} className="text-copailot-navy hover:text-copailot-indigo transition-colors">
                              {breadcrumb.label}
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage className="text-copailot-indigo font-medium">{breadcrumb.label}</BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <div className="ml-auto px-4">
                <div className="flex items-center gap-2">
                  <ChatSidebarTrigger />
                  <span className="text-lg font-bold">
                    <span className="text-copailot-indigo">COP</span><span className="text-copailot-electric">AI</span><span className="text-copailot-indigo">LOT</span>
                  </span>
                </div>
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
              {children}
            </div>
          </SidebarInset>
          
          <ChatSidebar />
        </div>
      </SidebarProvider>
    </ChatSidebarProvider>
  )
}) 