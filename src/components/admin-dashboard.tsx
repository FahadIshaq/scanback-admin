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
import { 
  QrCode, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Plus,
  List,
  UserCheck,
  Activity
} from "lucide-react"

type TabType = "overview" | "generate" | "qrcodes" | "users" | "analytics"

export function AdminDashboard() {
  const { admin, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>("overview")
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
      // This would be replaced with actual API calls
      setStats({
        totalQRCodes: 1250,
        totalUsers: 340,
        totalScans: 5670,
        activeQRCodes: 890
      })
    } catch (error) {
      console.error("Failed to load stats:", error)
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
    { id: "analytics", label: "Analytics", icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <QrCode className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ScanBack Admin</h1>
                <p className="text-sm text-gray-500">QR Code Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{admin?.name}</p>
                <p className="text-xs text-gray-500">{admin?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-screen">
          <nav className="p-4 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
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
        <main className="flex-1 p-6">
          {activeTab === "overview" && <StatsOverview stats={stats} />}
          {activeTab === "generate" && <QRCodeGenerator />}
          {activeTab === "qrcodes" && <QRCodeList />}
          {activeTab === "users" && <UsersList />}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Dashboard</CardTitle>
                  <CardDescription>
                    Detailed analytics and reporting features coming soon
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Analytics dashboard is under development</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
