"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Search, Filter, Mail, Phone, Calendar, Eye, QrCode } from "lucide-react"
import adminApiClient from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { UserDetailModal } from "@/components/user-detail-modal"

interface User {
  _id: string
  name: string
  email: string
  phone: string
  isEmailVerified: boolean
  isActive: boolean
  qrCodesCount?: number
  stats: {
    totalItems: number
    totalPets: number
    itemsFound: number
    petsFound: number
  }
  createdAt: string
  lastLogin?: string
  status?: "active" | "inactive" | "suspended"
}

export function UsersList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await adminApiClient.getAllUsers({
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined
      })
      
      if (response.success) {
        setUsers(response.data.users)
        setTotalPages(response.data.totalPages)
      }
    } catch (error) {
      console.error("Failed to load users:", error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const getStatusColor = (user: User) => {
    const status = user.status || (user.isActive ? "active" : "inactive")
    switch (status) {
      case "active": return "bg-green-100 text-green-800"
      case "inactive": return "bg-gray-100 text-gray-800"
      case "suspended": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getUserStatus = (user: User) => {
    return user.status || (user.isActive ? "active" : "inactive")
  }

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await adminApiClient.updateUserStatus(userId, newStatus)
      setUsers(prev => prev.map(user => 
        user._id === userId ? { ...user, status: newStatus as any, isActive: newStatus === "active" } : user
      ))
    } catch (error) {
      console.error("Failed to update user status:", error)
      alert("Failed to update user status")
    }
  }

  const handleViewDetails = (userId: string) => {
    setSelectedUserId(userId)
    setDetailModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Users Management</h2>
        <p className="text-sm sm:text-base text-gray-600">View and manage all registered users</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadUsers}>
              <Filter className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>
                All registered users in the system
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">User</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Phone</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Verified</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">QR Codes</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Items</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Pets</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Joined</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Last Login</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-sm text-gray-900">{user.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">{user.phone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Select
                            value={getUserStatus(user)}
                            onValueChange={(value) => handleStatusChange(user._id, value)}
                          >
                            <SelectTrigger className="w-28 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4">
                          {user.isEmailVerified ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              No
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <QrCode className="h-3 w-3 text-gray-400" />
                            <span className="font-semibold text-sm">{user.qrCodesCount || 0}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-medium">{user.stats?.totalItems || 0}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-medium">{user.stats?.totalPets || 0}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs text-gray-600">
                            {formatDate(user.createdAt)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {user.lastLogin ? (
                            <div className="text-xs text-gray-600">
                              {formatDate(user.lastLogin)}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Never</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewDetails(user._id)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-medium text-gray-900 text-sm truncate">{user.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user)}`}>
                              {getUserStatus(user)}
                            </span>
                            {user.isEmailVerified && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                Verified
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span>{user.phone}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewDetails(user._id)}
                        className="h-8 w-8 p-0 flex-shrink-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500 mb-3 pt-3 border-t">
                      <div className="flex items-center gap-1">
                        <QrCode className="h-3 w-3" />
                        <span><span className="font-medium">QR Codes:</span> {user.qrCodesCount || 0}</span>
                      </div>
                      <div>
                        <span className="font-medium">Items:</span> {user.stats?.totalItems || 0}
                      </div>
                      <div>
                        <span className="font-medium">Pets:</span> {user.stats?.totalPets || 0}
                      </div>
                      <div>
                        <span className="font-medium">Found Items:</span> {user.stats?.itemsFound || 0}
                      </div>
                      <div>
                        <span className="font-medium">Found Pets:</span> {user.stats?.petsFound || 0}
                      </div>
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>Joined: {formatDate(user.createdAt)}</span>
                      </div>
                      {user.lastLogin && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>Last login: {formatDate(user.lastLogin)}</span>
                        </div>
                      )}
                      <Select
                        value={getUserStatus(user)}
                        onValueChange={(value) => handleStatusChange(user._id, value)}
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* User Detail Modal */}
      <UserDetailModal
        userId={selectedUserId}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </div>
  )
}
