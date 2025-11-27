"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QrCode, Users, MousePointer, CheckCircle, Link2, RefreshCw, Package, BarChart3 } from "lucide-react"
import adminApiClient, { QRCode } from "@/lib/api"
import { formatDate } from "@/lib/utils"

type DashboardTab = "overview" | "generate" | "qrcodes" | "users" | "analytics" | "clients"

interface StatsOverviewProps {
  stats: {
    totalQRCodes: number
    totalUsers: number
    totalScans: number
    activeQRCodes: number
  }
  onRefresh?: () => void
  onNavigate?: (tab: DashboardTab) => void
}

interface RecentActivity {
  code: string
  type: string
  action: string
  time: string
  timestamp: Date
}

export function StatsOverview({ stats, onRefresh, onNavigate }: StatsOverviewProps) {
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loadingActivity, setLoadingActivity] = useState(true)

  useEffect(() => {
    loadRecentActivity()
  }, [])

  const loadRecentActivity = async () => {
    try {
      setLoadingActivity(true)
      
      // Try to get recent activity from the new endpoint
      try {
        const response = await adminApiClient.getRecentActivity(10)
        
        if (response.success && response.data.activities) {
          const activities: RecentActivity[] = response.data.activities.map((activity: any) => {
            const timestamp = new Date(activity.timestamp)
            const timeAgo = getTimeAgo(timestamp)
            
            return {
              code: activity.code,
              type: activity.type ? activity.type.charAt(0).toUpperCase() + activity.type.slice(1) : "Unknown",
              action: activity.action ? activity.action.charAt(0).toUpperCase() + activity.action.slice(1) : "Unknown",
              time: timeAgo,
              timestamp: timestamp
            }
          })
          
          setRecentActivity(activities.slice(0, 5))
          return
        }
      } catch (newEndpointError) {
        console.log("New endpoint not available, falling back to existing endpoints")
      }
      
      // Fallback: Get recent QR codes and scan history separately
      const activities: RecentActivity[] = []
      
      // Get recent QR codes (recently created or activated)
      try {
        const recentQRCodesResponse = await adminApiClient.getAllQRCodes({
          page: 1,
          limit: 10
        })

        if (recentQRCodesResponse.success && recentQRCodesResponse.data.qrCodes) {
          recentQRCodesResponse.data.qrCodes.slice(0, 5).forEach((qr: QRCode) => {
            const createdAt = new Date(qr.createdAt)
            const timeAgo = getTimeAgo(createdAt)
            
            activities.push({
              code: qr.code,
              type: qr.type.charAt(0).toUpperCase() + qr.type.slice(1),
              action: qr.isActivated ? "Activated" : "Created",
              time: timeAgo,
              timestamp: createdAt
            })
          })
        }
      } catch (error) {
        console.error("Failed to load recent QR codes:", error)
      }

      // Get recent scan history
      try {
        const scanHistoryResponse = await adminApiClient.getScanHistory({
          page: 1,
          limit: 10
        })

        if (scanHistoryResponse.success && scanHistoryResponse.data.qrCodes) {
          scanHistoryResponse.data.qrCodes.slice(0, 5).forEach((qr: any) => {
            if (qr.lastScanned) {
              const scannedAt = new Date(qr.lastScanned)
              const timeAgo = getTimeAgo(scannedAt)
              
              activities.push({
                code: qr.code,
                type: qr.type ? qr.type.charAt(0).toUpperCase() + qr.type.slice(1) : "Unknown",
                action: "Scanned",
                time: timeAgo,
                timestamp: scannedAt
              })
            }
          })
        }
      } catch (error) {
        console.error("Failed to load scan history:", error)
      }

      // Sort by timestamp (most recent first) and take top 5
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      setRecentActivity(activities.slice(0, 5))
    } catch (error) {
      console.error("Failed to load recent activity:", error)
      setRecentActivity([])
    } finally {
      setLoadingActivity(false)
    }
  }

  const getTimeAgo = (date: Date): string => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} day${days !== 1 ? 's' : ''} ago`
    }
  }

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "scanned":
        return "bg-blue-500"
      case "activated":
        return "bg-green-500"
      case "created":
        return "bg-purple-500"
      case "found":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }
  const statCards = [
    {
      title: "Total QR Codes",
      value: stats.totalQRCodes.toLocaleString(),
      description: "All generated QR codes",
      icon: QrCode,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Active Users",
      value: stats.totalUsers.toLocaleString(),
      description: "Registered users",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Total Scans",
      value: stats.totalScans.toLocaleString(),
      description: "QR code scans",
      icon: MousePointer,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Active QR Codes",
      value: stats.activeQRCodes.toLocaleString(),
      description: "Currently active",
      icon: CheckCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage Item, Pet, and Emergency QR codes - users fill details when scanning</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadRecentActivity} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Activity
            </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Relationship Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            User-QR Code Relationships
          </CardTitle>
          <CardDescription>
            Overview of how users and QR codes are connected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-gray-600 mb-1">Total Users</div>
              <div className="text-2xl font-bold text-blue-900">{stats.totalUsers}</div>
              <div className="text-xs text-gray-500 mt-1">Registered accounts</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm font-medium text-gray-600 mb-1">Total QR Codes</div>
              <div className="text-2xl font-bold text-green-900">{stats.totalQRCodes}</div>
              <div className="text-xs text-gray-500 mt-1">All generated codes</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm font-medium text-gray-600 mb-1">Average per User</div>
              <div className="text-2xl font-bold text-purple-900">
                {stats.totalUsers > 0 ? (stats.totalQRCodes / stats.totalUsers).toFixed(1) : '0'}
              </div>
              <div className="text-xs text-gray-500 mt-1">QR codes per user</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent QR Code Activity</CardTitle>
            <CardDescription>
              Latest QR code scans and activations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 ${getActionColor(activity.action)} rounded-full`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          <span className="font-mono text-xs">{activity.code}</span> ({activity.type})
                        </p>
                        <p className="text-xs text-gray-500">{activity.action}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  title: "Generate QR Codes",
                  description: "Create Item, Pet, and Emergency QR codes",
                  icon: QrCode,
                  bg: "bg-blue-50 hover:bg-blue-100",
                  iconColor: "text-blue-600",
                  tab: "generate" as DashboardTab,
                },
                {
                  title: "Manage QR Codes",
                  description: "Edit, assign, or delete QR codes",
                  icon: MousePointer,
                  bg: "bg-purple-50 hover:bg-purple-100",
                  iconColor: "text-purple-600",
                  tab: "qrcodes" as DashboardTab,
                },
                {
                  title: "Manage Users",
                  description: "View and manage user accounts",
                  icon: Users,
                  bg: "bg-green-50 hover:bg-green-100",
                  iconColor: "text-green-600",
                  tab: "users" as DashboardTab,
                },
                {
                  title: "Manage Clients",
                  description: "Allocate stock and view client QR codes",
                  icon: Package,
                  bg: "bg-amber-50 hover:bg-amber-100",
                  iconColor: "text-amber-600",
                  tab: "clients" as DashboardTab,
                },
                {
                  title: "View Analytics",
                  description: "Detailed usage statistics",
                  icon: BarChart3,
                  bg: "bg-blue-50 hover:bg-blue-100",
                  iconColor: "text-blue-600",
                  tab: "analytics" as DashboardTab,
                },
              ].map((action, index) => {
                const ActionIcon = action.icon
                return (
                  <button
                    key={index}
                    onClick={() => onNavigate?.(action.tab)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${action.bg}`}
                  >
                    <div className="flex items-center space-x-3">
                      <ActionIcon className={`h-5 w-5 ${action.iconColor}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{action.title}</p>
                        <p className="text-xs text-gray-500">{action.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
