"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Suspense, useEffect, useState } from "react"
import { 
  BookOpen, 
  PieChart, 
  Trophy, 
  Plus, 
  ArrowRight, 
  Wrench, 
  Calculator,
  DollarSign,
  BarChart3,
  Users,
  Activity,
  Bell,
  FileText,
  Clock,
  Target,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useUserStore, useAssessmentStore, useProductStore } from "@/stores"
import { observer } from "mobx-react-lite"
import { AuthProvider } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"

const DashboardContent = observer(() => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const userStore = useUserStore()
  const assessmentStore = useAssessmentStore()
  const productStore = useProductStore()
  const [hasReport, setHasReport] = useState(false)
  const [checkingReport, setCheckingReport] = useState(false)
  
  const breadcrumbs = [
    { label: "Overview" }
  ]

  // Check auth status and load data
  useEffect(() => {
    const checkAuth = async () => {
      // Check if user is authenticated
      await userStore.checkSession()
      
      // If not authenticated, redirect to login
      if (!userStore.isAuthenticated) {
        router.push('/auth/login')
        return
      }

      // Load user data if authenticated
      if (!userStore.profile) {
        await userStore.loadUserData()
      }

      // If no organization, redirect to onboarding
      if (!userStore.hasOrganization) {
        router.push('/auth/onboarding')
        return
      }

      // Load assessment data if user is authenticated
      if (userStore.isAuthenticated && assessmentStore.questions.length === 0) {
        await assessmentStore.loadQuestions()
        if (userStore.user?.id) {
          await assessmentStore.loadUserResponses(userStore.user.id)
        }
      }

      // Load product data if user is authenticated
      if (userStore.isAuthenticated && userStore.user?.id && userStore.organization?.id) {
        await productStore.loadProducts(userStore.user.id, userStore.organization.id)
      }

      // Check for existing assessment report
      if (userStore.isAuthenticated && userStore.organization?.id) {
        await checkForReport()
      }
    }

    const checkForReport = async () => {
      if (!userStore.organization?.id) return
      
      setCheckingReport(true)
      try {
        const { data: reports, error } = await supabase
          .from('assessment_reports')
          .select('id')
          .eq('organization_id', userStore.organization.id)
          .limit(1)

        if (error) {
          console.error('Error checking for reports:', error)
        } else {
          setHasReport(reports && reports.length > 0)
        }
      } catch (error) {
        console.error('Failed to check for reports:', error)
      } finally {
        setCheckingReport(false)
      }
    }

    checkAuth()
  }, [userStore, router, assessmentStore, productStore])

  // Show loading while checking auth
  if (userStore.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-copailot-indigo mx-auto" />
          <p className="text-copailot-navy/70">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Don't render content if redirecting
  if (!userStore.isAuthenticated || !userStore.hasOrganization) {
    return null
  }

  // Get URL parameters to determine what to show
  const hasAcademyProgress = searchParams.get('academy_p') === 'true'
  const hasCatalogData = searchParams.get('acatalog_p') === 'true'

  // Get real product data
  const hasProducts = productStore.products.length > 0
  const productCount = productStore.products.length

  // Get real assessment data
  const hasAssessmentProgress = assessmentStore.totalQuestions > 0 && assessmentStore.completedQuestions > 0
  const assessmentProgress = {
    completedQuestions: assessmentStore.completedQuestions,
    totalQuestions: assessmentStore.totalQuestions,
    progressPercentage: assessmentStore.progressPercentage,
    firstUnansweredIndex: assessmentStore.firstUnansweredQuestionIndex,
    nextQuestionNumber: assessmentStore.firstUnansweredQuestionIndex + 1,
    isComplete: assessmentStore.progressPercentage === 100
  }

  // Mock data for academy - replace with real data later
  const academyProgress = {
    completedCourses: 2,
    totalCourses: 5,
    nextLesson: {
      title: "Export Documentation & Customs",
      course: "Consumer Electronics Export Strategy",
      id: "react-advanced"
    }
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-8 mt-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-copailot-indigo/10 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-copailot-indigo to-copailot-navy rounded-lg flex items-center justify-center">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-copailot-navy">Welcome back!</h1>
                <p className="text-copailot-navy/70">Continue your learning journey and track your progress</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress & Invitation Cards - Row 1 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 md:grid-rows-1">
          {/* Assessment Progress or Invitation */}
          {assessmentStore.isLoading ? (
            <Card className="border-l-4 border-l-copailot-indigo bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="h-6 w-6 text-copailot-indigo animate-spin" />
                  <span className="font-semibold text-copailot-navy">Loading Assessment...</span>
                </div>
                <div className="animate-pulse">
                  <div className="h-8 bg-copailot-indigo/10 rounded w-20 mb-2"></div>
                  <div className="h-2 bg-copailot-indigo/10 rounded w-full mb-4"></div>
                  <div className="h-4 bg-copailot-indigo/10 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-copailot-indigo/10 rounded w-full mb-3"></div>
                  <div className="h-8 bg-copailot-indigo/10 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ) : hasAssessmentProgress ? (
            <Card className="border-l-4 border-l-copailot-indigo bg-white shadow-sm hover:shadow-md transition-all h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <PieChart className="h-6 w-6 text-copailot-indigo" />
                      <span className="font-semibold text-copailot-navy">Assessment Progress</span>
                    </div>
                    <div className="text-lg font-bold text-copailot-indigo">
                      {Math.round(assessmentProgress.progressPercentage)}%
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-copailot-navy mb-2">
                    {assessmentProgress.completedQuestions}/{assessmentProgress.totalQuestions}
                  </div>
                  <div className="w-full bg-copailot-navy/10 rounded-full h-2 mb-4">
                    <div 
                      className="bg-copailot-indigo h-2 rounded-full transition-all duration-500"
                      style={{ width: `${assessmentProgress.progressPercentage}%` }}
                    ></div>
                  </div>
                  <div>
                    <p className="text-sm text-copailot-navy/70 mb-2">
                      {assessmentProgress.isComplete ? (hasReport ? 'Report Available!' : 'Assessment Complete!') : `Next question:`}
                    </p>
                    <h4 className="font-bold text-copailot-indigo text-sm leading-tight h-10 flex items-center">
                      {assessmentProgress.isComplete ? (hasReport ? 'View your report' : 'View your results') : `Question ${assessmentProgress.nextQuestionNumber}`}
                    </h4>
                  </div>
                </div>
                <div className="mt-auto">
                  <Link href={assessmentProgress.isComplete ? (hasReport ? "/assessment/report" : "/assessment") : `/assessment/questions?continue=true`}>
                    <Button size="sm" className="w-full bg-copailot-indigo hover:bg-copailot-indigo/90 text-white" disabled={checkingReport}>
                      {checkingReport ? (
                        <>
                          <Loader2 className="ml-2 h-3 w-3 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          {assessmentProgress.isComplete ? (hasReport ? 'View Report' : 'View Results') : 'Continue Assessment'}
                          <ArrowRight className="ml-2 h-3 w-3" />
                        </>
                      )}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-l-4 border-l-copailot-indigo bg-white shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <PieChart className="h-6 w-6 text-copailot-indigo" />
                    <span className="font-semibold text-copailot-navy">Start Assessment</span>
                  </div>
                  <div className="h-10 flex items-center">
                    <p className="text-copailot-navy/70 text-sm leading-tight">
                      Evaluate your business readiness with our comprehensive assessment tool
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  <Link href="/assessment">
                    <Button className="w-full bg-copailot-indigo hover:bg-copailot-indigo/90 text-white group-hover:shadow-md transition-all">
                      Begin Assessment
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Experts */}
          <Link href="/experts" className="block">
            <Card className="border-l-4 border-l-copailot-electric bg-white shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="h-6 w-6 text-copailot-electric" />
                    <span className="font-semibold text-copailot-navy">AI Experts</span>
                  </div>
                  <div className="h-10 flex items-center mb-4">
                    <p className="text-copailot-navy/70 text-sm leading-tight">
                      Connect with AI-powered trade experts for personalized guidance and market insights
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  <Button size="sm" className="w-full bg-copailot-electric hover:bg-copailot-electric/90 text-white group-hover:shadow-md transition-all">
                    Consult Experts
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Product Catalog Stats or Invitation */}
          {productStore.isLoading ? (
            <Card className="border-l-4 border-l-copailot-navy bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="h-6 w-6 text-copailot-navy animate-spin" />
                  <span className="font-semibold text-copailot-navy">Loading Products...</span>
                </div>
                <div className="animate-pulse">
                  <div className="h-8 bg-copailot-navy/10 rounded w-20 mb-2"></div>
                  <div className="h-2 bg-copailot-navy/10 rounded w-full mb-4"></div>
                  <div className="h-4 bg-copailot-navy/10 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-copailot-navy/10 rounded w-full mb-3"></div>
                  <div className="h-8 bg-copailot-navy/10 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ) : hasProducts ? (
            <Link href="/tools/product-portfolio" className="block">
              <Card className="border-l-4 border-l-copailot-navy bg-white shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="h-6 w-6 text-copailot-navy" />
                      <span className="font-semibold text-copailot-navy">Active Products in Catalog</span>
                    </div>
                    <div className="text-3xl font-bold text-copailot-navy mb-2">{productCount}</div>
                    <div className="w-full bg-copailot-navy/10 rounded-full h-2 mb-4">
                      <div 
                        className="bg-copailot-navy h-2 rounded-full transition-all duration-500"
                        style={{ width: `100%` }}
                      ></div>
                    </div>
                    <div>
                      <p className="text-sm text-copailot-navy/70 mb-2">Portfolio status:</p>
                      <h4 className="font-bold text-copailot-navy text-sm leading-tight h-10 flex items-center">
                        {productCount === 1 ? '1 product' : `${productCount} products`} in your portfolio
                      </h4>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <Button size="sm" className="w-full bg-copailot-navy hover:bg-copailot-navy/90 text-white group-hover:shadow-md transition-all">
                      View Portfolio
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Link href="/tools/product-portfolio" className="block">
              <Card className="border-l-4 border-l-copailot-navy bg-white shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <Plus className="h-6 w-6 text-copailot-navy" />
                      <span className="font-semibold text-copailot-navy">Build Product Catalog</span>
                    </div>
                    <div className="h-10 flex items-center">
                      <p className="text-copailot-navy/70 text-sm leading-tight">
                        Add your products to start analyzing market opportunities and pricing strategies
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <Button className="w-full bg-copailot-navy hover:bg-copailot-navy/90 text-white group-hover:shadow-md transition-all">
                      Add Products
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Academy Progress or Invitation */}
          {hasAcademyProgress ? (
            <Card className="border-l-4 border-l-copailot-electric bg-white shadow-sm hover:shadow-md transition-all h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="h-6 w-6 text-copailot-electric" />
                    <span className="font-semibold text-copailot-navy">Academy Progress</span>
                  </div>
                  <div className="text-3xl font-bold text-copailot-navy mb-2">
                    {academyProgress.completedCourses}/{academyProgress.totalCourses}
                  </div>
                  <div className="w-full bg-copailot-navy/10 rounded-full h-2 mb-4">
                    <div 
                      className="bg-copailot-electric h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(academyProgress.completedCourses / academyProgress.totalCourses) * 100}%` }}
                    ></div>
                  </div>
                  <div>
                    <p className="text-sm text-copailot-navy/70 mb-2">Next lesson:</p>
                    <h4 className="font-bold text-copailot-electric text-sm leading-tight h-10 flex items-center">
                      {academyProgress.nextLesson.title}
                    </h4>
                  </div>
                </div>
                <div className="mt-auto">
                  <Link href={`/academy/${academyProgress.nextLesson.id}`}>
                    <Button size="sm" className="w-full bg-copailot-electric hover:bg-copailot-electric/90 text-white">
                      Go to Lesson
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-l-4 border-l-copailot-electric bg-white shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="h-6 w-6 text-copailot-electric" />
                    <span className="font-semibold text-copailot-navy">Start Academy</span>
                  </div>
                  <div className="h-10 flex items-center">
                    <p className="text-copailot-navy/70 text-sm leading-tight">
                      Begin your learning journey with expert-led courses on international trade
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  <Link href="/academy">
                    <Button className="w-full bg-copailot-electric hover:bg-copailot-electric/90 text-white group-hover:shadow-md transition-all">
                      Explore Courses
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content - Row 2 */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Tools */}
          <Card className="bg-white shadow-sm hover:shadow-md transition-all border-t-4 border-t-copailot-indigo">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-copailot-indigo rounded-lg flex items-center justify-center">
                  <Wrench className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-copailot-navy">Tools</CardTitle>
              </div>
              <CardDescription className="text-copailot-navy/70">
                Powerful analysis tools for your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Link href="/tools/product-portfolio" className="block group">
                  <div className="flex items-start gap-3 hover:bg-copailot-navy/5 p-3 rounded-lg transition-colors">
                    <FileText className="h-5 w-5 text-copailot-indigo mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-copailot-navy group-hover:text-copailot-indigo transition-colors">Product Portfolio</h4>
                      <p className="text-sm text-copailot-navy/70 mt-1">Manage and organize your product portfolio with detailed specifications and market data.</p>
                    </div>
                  </div>
                </Link>
                <Link href="/tools/price-benchmarking" className="block group">
                  <div className="flex items-start gap-3 hover:bg-copailot-navy/5 p-3 rounded-lg transition-colors">
                    <BarChart3 className="h-5 w-5 text-copailot-electric mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-copailot-navy group-hover:text-copailot-electric transition-colors">Price Benchmarking</h4>
                      <p className="text-sm text-copailot-navy/70 mt-1">Compare your products against market standards and competitor analysis.</p>
                    </div>
                  </div>
                </Link>
                
                <Link href="/tools/cost-calculator" className="block group">
                  <div className="flex items-start gap-3 hover:bg-copailot-navy/5 p-3 rounded-lg transition-colors">
                    <Calculator className="h-5 w-5 text-copailot-electric mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-copailot-navy group-hover:text-copailot-electric transition-colors">Cost Calculator</h4>
                      <p className="text-sm text-copailot-navy/70 mt-1">Calculate comprehensive costs including shipping, duties, and operational expenses.</p>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card className="bg-white shadow-sm hover:shadow-md transition-all border-t-4 border-t-copailot-electric">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-copailot-electric rounded-lg flex items-center justify-center">
                  <Bell className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-copailot-navy">Announcements</CardTitle>
              </div>
              <CardDescription className="text-copailot-navy/70">
                Latest updates and news
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-copailot-electric/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-copailot-electric" />
                    <span className="text-sm font-semibold text-copailot-navy">New Features</span>
                  </div>
                  <p className="text-sm text-copailot-navy/70">Enhanced market analysis tools now available with real-time data integration.</p>
                </div>
                <div className="p-4 rounded-lg border border-copailot-indigo/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-copailot-indigo" />
                    <span className="text-sm font-semibold text-copailot-navy">Maintenance</span>
                  </div>
                  <p className="text-sm text-copailot-navy/70">Scheduled maintenance on Sunday 3-5 AM EST. All services will be briefly unavailable.</p>
                </div>
                <div className="p-4 rounded-lg border border-copailot-navy/20">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-copailot-navy" />
                    <span className="text-sm font-semibold text-copailot-navy">Academy Update</span>
                  </div>
                  <p className="text-sm text-copailot-navy/70">Three new courses added covering advanced export strategies.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-white shadow-sm hover:shadow-md transition-all border-t-4 border-t-copailot-navy">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-copailot-navy rounded-lg flex items-center justify-center">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-copailot-navy">Recent Activity</CardTitle>
              </div>
              <CardDescription className="text-copailot-navy/70">
                Latest updates and achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-copailot-electric rounded-full mt-2 flex-shrink-0"></div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-copailot-navy">
                      Completed Export Documentation lesson
                    </p>
                    <p className="text-xs text-copailot-navy/60">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-copailot-indigo rounded-full mt-2 flex-shrink-0"></div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-copailot-navy">
                      Assessment section completed
                    </p>
                    <p className="text-xs text-copailot-navy/60">4 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-copailot-navy rounded-full mt-2 flex-shrink-0"></div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-copailot-navy">
                      New course available in Academy
                    </p>
                    <p className="text-xs text-copailot-navy/60">6 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-copailot-electric rounded-full mt-2 flex-shrink-0"></div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-copailot-navy">
                      Market analysis tool used
                    </p>
                    <p className="text-xs text-copailot-navy/60">1 day ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
})

export default function DashboardPage() {
  return (
    <AuthProvider requireAuth={true}>
      <Suspense fallback={
        <DashboardLayout breadcrumbs={[{ label: "Overview" }]}>
          <div className="space-y-8 mt-6">
            <div className="bg-white rounded-xl border border-copailot-indigo/10 shadow-sm p-8">
              <div className="animate-pulse">
                <div className="h-8 bg-copailot-indigo/10 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-copailot-indigo/10 rounded w-1/2 mb-6"></div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
                  <div className="h-32 bg-copailot-indigo/10 rounded"></div>
                  <div className="h-32 bg-copailot-electric/10 rounded"></div>
                  <div className="h-32 bg-copailot-navy/10 rounded"></div>
                  <div className="h-32 bg-copailot-electric/10 rounded"></div>
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="h-64 bg-copailot-indigo/10 rounded"></div>
                  <div className="h-64 bg-copailot-electric/10 rounded"></div>
                  <div className="h-64 bg-copailot-navy/10 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </DashboardLayout>
      }>
        <DashboardContent />
      </Suspense>
    </AuthProvider>
  )
} 