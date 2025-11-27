"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { QRCodeGenerator } from "@/components/qr-code-generator"
import { QRCodeList } from "@/components/qr-code-list"
import { StatsOverview } from "@/components/stats-overview"
import { UsersList } from "@/components/users-list"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { ClientsList } from "@/components/clients-list"
import { EmailComposer } from "@/components/email-composer"
import adminApiClient from "@/lib/api"
import { 
  QrCode, 
  Users, 
  BarChart3, 
  LogOut,
  Plus,
  Activity,
  Menu,
  X,
  Package,
  Mail
} from "lucide-react"

type TabType = "overview" | "generate" | "qrcodes" | "users" | "analytics" | "clients" | "email"

export function AdminDashboard() {
  const { admin, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [stats, setStats] = useState({
    totalQRCodes: 0,
    totalUsers: 0,
    totalScans: 0,
    activeQRCodes: 0
  })

  useEffect(() => {
    // Load dashboard stats
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await adminApiClient.getQRCodeStats()
      console.log("Stats response:", response)
      
      if (response.success && response.data) {
        const statsData = response.data
        console.log("Stats data:", statsData)
        
        setStats({
          totalQRCodes: Number(statsData.totalQRCodes) || 0,
          totalUsers: Number(statsData.totalUsers) || 0,
          totalScans: Number(statsData.totalScans) || 0,
          activeQRCodes: Number(statsData.activeQRCodes) || 0
        })
      } else {
        console.error("Failed to load stats: Invalid response", response)
        setStats({
          totalQRCodes: 0,
          totalUsers: 0,
          totalScans: 0,
          activeQRCodes: 0
        })
      }
    } catch (error) {
      console.error("Failed to load stats:", error)
      // Set default values on error
      setStats({
        totalQRCodes: 0,
        totalUsers: 0,
        totalScans: 0,
        activeQRCodes: 0
      })
    }
  }

  const handleLogout = () => {
    console.log('Logout button clicked')
    logout()
    router.push('/login')
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "generate", label: "Generate QR", icon: Plus },
    { id: "qrcodes", label: "QR Codes", icon: QrCode },
    { id: "users", label: "Users", icon: Users },
    { id: "clients", label: "Clients", icon: Package },
    { id: "analytics", label: "Analytics", icon: Activity },
    { id: "email", label: "Send Email", icon: Mail },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
              <div className="p-2 bg-black rounded-lg">
                <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-black">ScanBack Admin</h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">QR Code Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{admin?.name}</p>
                <p className="text-xs text-gray-500">{admin?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs sm:text-sm">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white shadow-lg lg:shadow-sm
          transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          min-h-screen lg:min-h-0
        `}>
          <nav className="p-4 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as TabType)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 w-full lg:w-auto">
          {activeTab === "overview" && (
            <StatsOverview 
              stats={stats} 
              onRefresh={loadStats} 
              onNavigate={(tab) => setActiveTab(tab as TabType)} 
            />
          )}
          {activeTab === "generate" && <QRCodeGenerator />}
          {activeTab === "qrcodes" && <QRCodeList />}
          {activeTab === "users" && <UsersList />}
          {activeTab === "clients" && <ClientsList />}
          {activeTab === "analytics" && <AnalyticsDashboard />}
          {activeTab === "email" && <EmailComposer />}
        </main>
      </div>
    </div>
  )
}
