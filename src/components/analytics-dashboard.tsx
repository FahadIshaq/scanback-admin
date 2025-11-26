"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Activity, 
  TrendingUp, 
  Users, 
  QrCode, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  MousePointer,
  BarChart3,
  PieChart,
  Award,
  Eye,
  AlertCircle,
  Heart,
  Package
} from "lucide-react"
import adminApiClient from "@/lib/api"
import { formatDate } from "@/lib/utils"

interface AnalyticsData {
  qrCodeStats: Array<{
    _id: string;
    count: number;
    items: number;
    pets: number;
    emergency: number;
    activated: number;
  }>;
  userStats: Array<{
    _id: string;
    count: number;
    verified: number;
  }>;
  period: string;
  overview: {
    qrCodes: {
      total: number;
      activated: number;
      notActivated: number;
      totalScans: number;
      avgScans: number;
      activationRate: number;
    };
    users: {
      total: number;
      verified: number;
      active: number;
      verificationRate: number;
    };
  };
  breakdown: {
    byType: Array<{
      _id: string;
      count: number;
      activated: number;
      totalScans: number;
    }>;
    byStatus: Array<{
      _id: string;
      count: number;
    }>;
  };
  distribution: {
    qrCodesPerUser: Array<{
      _id: number;
      users: number;
    }>;
  };
  topPerformers: {
    mostScanned: Array<{
      code: string;
      type: string;
      details: {
        name: string;
      };
      scanCount: number;
      lastScanned?: string;
      status: string;
      owner?: {
        name: string;
        email: string;
      };
    }>;
  };
  recentActivity: {
    scansLast7Days: number;
  };
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30d")

  useEffect(() => {
    loadAnalytics()
  }, [period])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const response = await adminApiClient.getAnalytics(period)
      if (response.success) {
        setAnalytics(response.data)
      }
    } catch (error) {
      console.error("Failed to load analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "7d": return "Last 7 Days"
      case "30d": return "Last 30 Days"
      case "90d": return "Last 90 Days"
      case "1y": return "Last Year"
      default: return "Last 30 Days"
    }
  }

  const periodTotalQRCodes = analytics?.qrCodeStats.reduce((sum, stat) => sum + stat.count, 0) || 0
  const periodTotalItems = analytics?.qrCodeStats.reduce((sum, stat) => sum + stat.items, 0) || 0
  const periodTotalPets = analytics?.qrCodeStats.reduce((sum, stat) => sum + stat.pets, 0) || 0
  const periodTotalEmergency = analytics?.qrCodeStats.reduce((sum, stat) => sum + (stat.emergency || 0), 0) || 0
  const periodTotalUsers = analytics?.userStats.reduce((sum, stat) => sum + stat.count, 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm sm:text-base text-gray-600">Comprehensive analytics and insights for QR codes, users, and system performance</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="1y">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : analytics ? (
        <>
          {/* Overall Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total QR Codes
                </CardTitle>
                <div className="p-2 rounded-lg bg-blue-50">
                <QrCode className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{(analytics.overview?.qrCodes?.total || 0).toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">All time total</p>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">{(analytics.overview?.qrCodes?.activated || 0).toLocaleString()} activated</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Users
                </CardTitle>
                <div className="p-2 rounded-lg bg-green-50">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{(analytics.overview?.users?.total || 0).toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">Registered users</p>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <CheckCircle className="h-3 w-3 text-blue-600" />
                  <span className="text-blue-600">{(analytics.overview?.users?.verified || 0).toLocaleString()} verified</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Scans
                </CardTitle>
                <div className="p-2 rounded-lg bg-purple-50">
                  <MousePointer className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{(analytics.overview?.qrCodes?.totalScans || 0).toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">All time scans</p>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <BarChart3 className="h-3 w-3 text-purple-600" />
                  <span className="text-purple-600">Avg: {(analytics.overview?.qrCodes?.avgScans || 0).toFixed(1)} per QR</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Activation Rate
                </CardTitle>
                <div className="p-2 rounded-lg bg-orange-50">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{(analytics.overview?.qrCodes?.activationRate || 0).toFixed(1)}%</div>
                <p className="text-xs text-gray-500 mt-1">QR codes activated</p>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="text-gray-600">
                    {(analytics.overview?.qrCodes?.notActivated || 0).toLocaleString()} not activated
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Period Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-600">Created This Period</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-gray-900">{periodTotalQRCodes}</div>
                <p className="text-xs text-gray-500 mt-1">{getPeriodLabel(period)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-600">Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-green-600">{periodTotalItems}</div>
                <p className="text-xs text-gray-500 mt-1">Item QR codes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-600">Pets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-orange-600">{periodTotalPets}</div>
                <p className="text-xs text-gray-500 mt-1">Pet QR codes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-600">Emergency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-red-600">{periodTotalEmergency}</div>
                <p className="text-xs text-gray-500 mt-1">Emergency QR codes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-600">New Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-purple-600">{periodTotalUsers}</div>
                <p className="text-xs text-gray-500 mt-1">Registered</p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QR Code Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  QR Codes by Type
                </CardTitle>
                <CardDescription>Distribution of QR codes across different types</CardDescription>
              </CardHeader>
              <CardContent>
                {!analytics.breakdown?.byType || analytics.breakdown.byType.length === 0 ? (
                  <div className="text-center py-8">
                    <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.breakdown.byType.map((type, index) => {
                      const total = analytics.overview?.qrCodes?.total || 1
                      const percentage = (type.count / total) * 100
                      const typeColors: Record<string, { bg: string; text: string; icon: any }> = {
                        item: { bg: 'bg-green-100', text: 'text-green-700', icon: Package },
                        pet: { bg: 'bg-orange-100', text: 'text-orange-700', icon: Heart },
                        emergency: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
                      }
                      const colors = typeColors[type._id] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: QrCode }
                      const Icon = colors.icon

                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${colors.bg}`}>
                                <Icon className={`h-4 w-4 ${colors.text}`} />
                              </div>
                              <div>
                                <span className="font-medium capitalize">{type._id}</span>
                                <p className="text-xs text-gray-500">
                                  {type.activated} activated • {type.totalScans} scans
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-900">{type.count.toLocaleString()}</div>
                              <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`${colors.bg.replace('100', '500')} h-2 rounded-full transition-all`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* QR Code Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  QR Codes by Status
                </CardTitle>
                <CardDescription>Current status distribution of all QR codes</CardDescription>
              </CardHeader>
              <CardContent>
                {!analytics.breakdown?.byStatus || analytics.breakdown.byStatus.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.breakdown.byStatus.map((status, index) => {
                      const total = analytics.overview?.qrCodes?.total || 1
                      const percentage = (status.count / total) * 100
                      const statusColors: Record<string, { bg: string; text: string }> = {
                        active: { bg: 'bg-green-100', text: 'text-green-700' },
                        inactive: { bg: 'bg-gray-100', text: 'text-gray-700' },
                        suspended: { bg: 'bg-red-100', text: 'text-red-700' },
                        found: { bg: 'bg-blue-100', text: 'text-blue-700' },
                      }
                      const colors = statusColors[status._id] || { bg: 'bg-gray-100', text: 'text-gray-700' }

                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${colors.bg.replace('100', '500')}`}></div>
                              <span className="font-medium capitalize">{status._id}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-900">{status.count.toLocaleString()}</div>
                              <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`${colors.bg.replace('100', '500')} h-2 rounded-full transition-all`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Top Performing QR Codes
              </CardTitle>
              <CardDescription>Most scanned QR codes with detailed statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {!analytics.topPerformers?.mostScanned || analytics.topPerformers.mostScanned.length === 0 ? (
                <div className="text-center py-8">
                  <Eye className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No scan data available</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Rank</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">QR Code</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Owner</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Scans</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Last Scanned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.topPerformers.mostScanned.map((qr, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold">
                                {index + 1}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{qr.code}</code>
                            </td>
                            <td className="py-3 px-4">
                              <span className="capitalize px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                {qr.type}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium">{qr.details?.name || 'N/A'}</span>
                            </td>
                            <td className="py-3 px-4">
                              {qr.owner && qr.owner.email !== 'admin@scanback.co.za' ? (
                                <div>
                                  <div className="text-sm font-medium">{qr.owner.name}</div>
                                  <div className="text-xs text-gray-500">{qr.owner.email}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">Unassigned</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <MousePointer className="h-4 w-4 text-purple-600" />
                                <span className="font-bold text-purple-600">{qr.scanCount.toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`capitalize px-2 py-1 rounded text-xs font-medium ${
                                qr.status === 'active' ? 'bg-green-100 text-green-700' :
                                qr.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                                qr.status === 'suspended' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {qr.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {qr.lastScanned ? (
                                <span className="text-sm text-gray-600">{formatDate(qr.lastScanned)}</span>
                              ) : (
                                <span className="text-sm text-gray-400">Never</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-3">
                    {analytics.topPerformers.mostScanned.map((qr, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{qr.details?.name || 'N/A'}</div>
                              <code className="text-xs font-mono text-gray-600">{qr.code}</code>
                            </div>
                          </div>
                          <span className={`capitalize px-2 py-1 rounded text-xs font-medium ${
                            qr.status === 'active' ? 'bg-green-100 text-green-700' :
                            qr.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                            qr.status === 'suspended' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {qr.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Type:</span>
                            <span className="ml-1 capitalize font-medium">{qr.type}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Scans:</span>
                            <span className="ml-1 font-bold text-purple-600">{qr.scanCount.toLocaleString()}</span>
                          </div>
                          {qr.owner && qr.owner.email !== 'admin@scanback.co.za' && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Owner:</span>
                              <span className="ml-1 font-medium">{qr.owner.name}</span>
                            </div>
                          )}
                          {(!qr.owner || (qr.owner && qr.owner.email === 'admin@scanback.co.za')) && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Owner:</span>
                              <span className="ml-1 text-gray-400 italic">Unassigned</span>
                            </div>
                          )}
                          {qr.lastScanned && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Last Scanned:</span>
                              <span className="ml-1">{formatDate(qr.lastScanned)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* QR Code Distribution and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QR Codes Per User Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  QR Codes Distribution
                </CardTitle>
                <CardDescription>How QR codes are distributed among users</CardDescription>
              </CardHeader>
              <CardContent>
                {!analytics.distribution?.qrCodesPerUser || analytics.distribution.qrCodesPerUser.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No distribution data available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.distribution.qrCodesPerUser.map((dist, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <QrCode className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{dist._id} QR Code{dist._id !== 1 ? 's' : ''}</div>
                            <div className="text-xs text-gray-500">per user</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">{dist.users.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">users</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity Summary
                </CardTitle>
                <CardDescription>Quick overview of recent system activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-700">Scans (Last 7 Days)</div>
                        <div className="text-xs text-gray-500 mt-1">Recent scan activity</div>
                      </div>
                      <div className="text-3xl font-bold text-blue-600">
                        {(analytics.recentActivity?.scansLast7Days || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-xs text-gray-600">User Verification Rate</div>
                      <div className="text-xl font-bold text-green-600 mt-1">
                        {(analytics.overview?.users?.verificationRate || 0).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="text-xs text-gray-600">Active Users</div>
                      <div className="text-xl font-bold text-purple-600 mt-1">
                        {(analytics.overview?.users?.active || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QR Code Creation Trends */}
          <Card>
            <CardHeader>
              <CardTitle>QR Code Creation Trends</CardTitle>
              <CardDescription>
                Daily breakdown of QR codes created over {getPeriodLabel(period).toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.qrCodeStats.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No data available for this period</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.qrCodeStats.map((stat, index) => {
                    const maxCount = Math.max(...analytics.qrCodeStats.map(s => s.count), 1)
                    const percentage = (stat.count / maxCount) * 100

                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{stat._id}</span>
                          </div>
                            <div className="flex items-center gap-3 text-xs">
                            <span className="text-gray-600">
                              Total: <span className="font-semibold">{stat.count}</span>
                            </span>
                            <span className="text-green-600">
                              Items: <span className="font-semibold">{stat.items}</span>
                            </span>
                            <span className="text-orange-600">
                              Pets: <span className="font-semibold">{stat.pets}</span>
                            </span>
                              {stat.emergency > 0 && (
                                <span className="text-red-600">
                                  Emergency: <span className="font-semibold">{stat.emergency}</span>
                                </span>
                              )}
                              <span className="text-blue-600">
                                Activated: <span className="font-semibold">{stat.activated}</span>
                              </span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

            {/* User Registration Trends */}
          <Card>
            <CardHeader>
              <CardTitle>User Registration Trends</CardTitle>
              <CardDescription>
                Daily breakdown of new user registrations over {getPeriodLabel(period).toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.userStats.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No data available for this period</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.userStats.map((stat, index) => {
                    const maxCount = Math.max(...analytics.userStats.map(s => s.count), 1)
                    const percentage = (stat.count / maxCount) * 100

                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{stat._id}</span>
                          </div>
                            <div className="flex items-center gap-3 text-xs">
                          <span className="text-gray-600">
                                New: <span className="font-semibold">{stat.count}</span>
                              </span>
                              {stat.verified !== undefined && (
                                <span className="text-green-600">
                                  Verified: <span className="font-semibold">{stat.verified}</span>
                          </span>
                              )}
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Failed to load analytics data</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

