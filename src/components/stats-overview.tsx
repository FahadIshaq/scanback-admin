"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCode, Users, MousePointer, CheckCircle } from "lucide-react"

interface StatsOverviewProps {
  stats: {
    totalQRCodes: number
    totalUsers: number
    totalScans: number
    activeQRCodes: number
  }
}

export function StatsOverview({ stats }: StatsOverviewProps) {
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600">Manage Item, Pet, and Emergency QR codes - users fill details when scanning</p>
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
            <div className="space-y-4">
              {[
                { code: "ABC123DEF456", type: "Pet", action: "Scanned", time: "2 minutes ago" },
                { code: "XYZ789GHI012", type: "Item", action: "Activated", time: "5 minutes ago" },
                { code: "EMG345RED678", type: "Emergency", action: "Activated", time: "8 minutes ago" },
                { code: "MNO345PQR678", type: "Pet", action: "Found", time: "10 minutes ago" },
                { code: "STU901VWX234", type: "Item", action: "Scanned", time: "15 minutes ago" },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.code} ({activity.type})
                      </p>
                      <p className="text-xs text-gray-500">{activity.action}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
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
              <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <QrCode className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Generate QR Codes</p>
                    <p className="text-xs text-gray-500">Create Item, Pet, and Emergency QR codes</p>
                  </div>
                </div>
              </button>
              
              <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Manage Users</p>
                    <p className="text-xs text-gray-500">View and manage user accounts</p>
                  </div>
                </div>
              </button>
              
              <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <MousePointer className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">View Analytics</p>
                    <p className="text-xs text-gray-500">Detailed usage statistics</p>
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
