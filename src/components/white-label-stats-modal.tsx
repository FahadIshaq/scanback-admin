"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import adminApiClient from "@/lib/api"
import { getTypeLabel } from "@/lib/qr-type-utils"
import {
  Loader2,
  QrCode,
  Users,
  Eye,
  CheckCircle,
  TrendingUp,
  Activity,
  Award,
  RefreshCw,
  Search,
  Shield,
  XCircle,
} from "lucide-react"

interface WhiteLabel {
  _id: string
  email: string
  logo?: string
  brandName: string
  website?: string
  isActive: boolean
}

interface WhiteLabelStatsModalProps {
  whiteLabel: WhiteLabel | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatNumber(n: number) {
  return n.toLocaleString()
}

export function WhiteLabelStatsModal({ whiteLabel, open, onOpenChange }: WhiteLabelStatsModalProps) {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [qrCodes, setQrCodes] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState("30d")
  const [qrSearch, setQrSearch] = useState("")
  const [userSearch, setUserSearch] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  const loadStats = useCallback(async () => {
    if (!whiteLabel) return
    try {
      setLoading(true)
      setError(null)
      const response = await adminApiClient.getWhiteLabelStats(whiteLabel._id)
      if (response.success) {
        setStats(response.data)
      } else {
        setError(response.message || "Failed to load stats")
      }
    } catch (err: any) {
      setError(err.message || "Failed to load stats")
    } finally {
      setLoading(false)
    }
  }, [whiteLabel])

  const loadAnalytics = useCallback(async () => {
    if (!whiteLabel) return
    try {
      const response = await adminApiClient.getWhiteLabelAnalytics(whiteLabel._id, period)
      if (response.success) {
        setAnalytics(response.data)
      }
    } catch (err) {
      console.error("Failed to load analytics:", err)
    }
  }, [whiteLabel, period])

  const loadQRCodes = useCallback(async () => {
    if (!whiteLabel) return
    try {
      const response = await adminApiClient.getWhiteLabelQRCodes(whiteLabel._id, {
        page: 1,
        limit: 50,
        search: qrSearch || undefined,
      })
      if (response.success) {
        setQrCodes(response.data.qrCodes || [])
      }
    } catch (err) {
      console.error("Failed to load QR codes:", err)
    }
  }, [whiteLabel, qrSearch])

  const loadUsers = useCallback(async () => {
    if (!whiteLabel) return
    try {
      const response = await adminApiClient.getWhiteLabelUsers(whiteLabel._id, {
        page: 1,
        limit: 50,
        search: userSearch || undefined,
      })
      if (response.success) {
        setUsers(response.data.users || [])
      }
    } catch (err) {
      console.error("Failed to load users:", err)
    }
  }, [whiteLabel, userSearch])

  useEffect(() => {
    if (open && whiteLabel) {
      loadStats()
      loadAnalytics()
      loadQRCodes()
      loadUsers()
    } else {
      setStats(null)
      setAnalytics(null)
      setQrCodes([])
      setUsers([])
      setError(null)
      setActiveTab("overview")
    }
  }, [open, whiteLabel, loadStats])

  useEffect(() => {
    if (open && whiteLabel) {
      loadAnalytics()
    }
  }, [period, open, whiteLabel, loadAnalytics])

  useEffect(() => {
    if (open && whiteLabel && activeTab === "qr-codes") {
      const timer = setTimeout(loadQRCodes, 300)
      return () => clearTimeout(timer)
    }
  }, [qrSearch, activeTab, open, whiteLabel, loadQRCodes])

  useEffect(() => {
    if (open && whiteLabel && activeTab === "users") {
      const timer = setTimeout(loadUsers, 300)
      return () => clearTimeout(timer)
    }
  }, [userSearch, activeTab, open, whiteLabel, loadUsers])

  const handleRefresh = () => {
    loadStats()
    loadAnalytics()
    loadQRCodes()
    loadUsers()
  }

  if (!whiteLabel) return null

  const company = stats?.whiteLabel || whiteLabel

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {company.logo && (
              <img
                src={company.logo}
                alt={company.brandName}
                className="h-10 w-10 object-contain rounded border bg-white p-1"
              />
            )}
            <div>
              <DialogTitle>{company.brandName} — Stats & Analytics</DialogTitle>
              <DialogDescription>
                {company.email}
                {company.website && ` • ${company.website}`}
                {" • "}
                {company.isActive ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-gray-500">Inactive</span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading && !stats ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>
        ) : stats ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between gap-4 mb-2">
              <TabsList className="grid grid-cols-4 w-full max-w-xl">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="qr-codes">QR Codes</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>

            <TabsContent value="overview" className="space-y-6 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Tags</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-primary" />
                      {formatNumber(stats.totalQRCodes || 0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Activated</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      {formatNumber(stats.activatedQRCodes || 0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Not Activated</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-orange-600" />
                      {formatNumber(stats.notActivatedQRCodes || 0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Scans</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Eye className="h-5 w-5 text-purple-600" />
                      {formatNumber(stats.totalScans || 0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Active Tags</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      {formatNumber(stats.activeQRCodes || 0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>End Users</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-600" />
                      {formatNumber(stats.totalUsers || 0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Admin Users</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Shield className="h-5 w-5 text-amber-600" />
                      {formatNumber(stats.adminCount || 0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Inactive Status</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Activity className="h-5 w-5 text-gray-600" />
                      {formatNumber(stats.inactiveQRCodes || 0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {stats.byType && stats.byType.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tags by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.byType.map((item: any) => (
                        <div
                          key={item._id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{getTypeLabel(item._id)}</p>
                            <p className="text-sm text-gray-500">
                              {item.activated} activated • {formatNumber(item.totalScans)} scans
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold">{item.total}</p>
                            {item.total > 0 && (
                              <p className="text-xs text-gray-500">
                                {((item.activated / item.total) * 100).toFixed(0)}% activated
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {stats.byStatus && stats.byStatus.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tags by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {stats.byStatus.map((item: any) => (
                        <Badge key={item._id} variant="outline" className="px-3 py-1 text-sm">
                          {item._id}: {item.count}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {stats.admins && stats.admins.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Admin Users</CardTitle>
                    <CardDescription>Users who can access the white-label portal</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.admins.map((admin: any) => (
                        <div
                          key={admin._id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{admin.name}</p>
                            <p className="text-sm text-gray-500">{admin.email}</p>
                          </div>
                          <Badge variant={admin.isActive ? "default" : "secondary"}>
                            {admin.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 mt-4">
              <div className="flex items-center justify-end">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!analytics ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Activation Rate</CardDescription>
                        <CardTitle className="text-2xl">
                          {analytics.overview?.qrCodes?.activationRate?.toFixed(1) ?? 0}%
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Avg Scans / Tag</CardDescription>
                        <CardTitle className="text-2xl">
                          {analytics.overview?.qrCodes?.avgScans?.toFixed(1) ?? 0}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Scans (7 days)</CardDescription>
                        <CardTitle className="text-2xl">
                          {formatNumber(analytics.recentActivity?.scansLast7Days ?? 0)}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Total Users</CardDescription>
                        <CardTitle className="text-2xl">
                          {formatNumber(analytics.overview?.users?.total ?? 0)}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </div>

                  {analytics.topPerformers?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5" />
                          Top Performing Tags
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {analytics.topPerformers.map((qr: any, index: number) => (
                            <div
                              key={qr.code}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                  {index + 1}
                                </span>
                                <div>
                                  <p className="font-medium">{qr.details?.name || qr.code}</p>
                                  <p className="text-xs text-gray-500 font-mono">
                                    {qr.code} • {getTypeLabel(qr.type)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{formatNumber(qr.scanCount)}</p>
                                <p className="text-xs text-gray-500">scans</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="qr-codes" className="space-y-4 mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by code, name, email, phone..."
                  value={qrSearch}
                  onChange={(e) => setQrSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {qrCodes.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No QR codes found for this company</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {qrCodes.map((qr: any) => (
                    <div
                      key={qr._id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-sm">{qr.code}</span>
                        <Badge variant="outline">{getTypeLabel(qr.type)}</Badge>
                        <Badge variant={qr.isActivated ? "default" : "secondary"}>
                          {qr.isActivated ? "Activated" : "Not Activated"}
                        </Badge>
                        {qr.owner && (
                          <span className="text-sm text-gray-500 truncate">
                            {qr.owner.name || qr.owner.email}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-3 shrink-0">
                        <span>{formatNumber(qr.scanCount || 0)} scans</span>
                        <Badge variant="outline">{qr.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-4 mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by name, email, phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {users.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No users found for this company</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {users.map((user: any) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{user.qrCodesCount ?? 0} tags</p>
                        <Badge variant={user.isActive ? "default" : "secondary"} className="mt-1">
                          {user.status || (user.isActive ? "active" : "inactive")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
