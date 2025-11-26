"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate } from "@/lib/utils"
import { User, Mail, Phone, Calendar, QrCode, Eye, Trash2 } from "lucide-react"
import adminApiClient, { QRCode } from "@/lib/api"

interface UserDetailModalProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated?: () => void
  onUserDeleted?: () => void
}

interface UserData {
  _id: string
  name: string
  email: string
  phone?: string
  isEmailVerified: boolean
  isActive: boolean
  role: string
  createdAt: string
  lastLogin?: string
  qrCodesCount?: number
  stats?: {
    totalItems?: number
    totalPets?: number
    itemsFound?: number
    petsFound?: number
  }
}

const buildFormState = (user?: UserData | null) => ({
  name: user?.name || "",
  email: user?.email || "",
  phone: user?.phone || "",
  role: user?.role || "user",
  status: user?.isActive ? "active" : "inactive",
  isActive: user?.isActive ?? true,
  isEmailVerified: user?.isEmailVerified ?? false,
  stats: {
    totalItems: user?.stats?.totalItems || 0,
    totalPets: user?.stats?.totalPets || 0,
    itemsFound: user?.stats?.itemsFound || 0,
    petsFound: user?.stats?.petsFound || 0,
  },
})

export function UserDetailModal({ userId, open, onOpenChange, onUserUpdated, onUserDeleted }: UserDetailModalProps) {
  const [user, setUser] = useState<UserData | null>(null)
  const [qrCodes, setQrCodes] = useState<QRCode[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingQRCodes, setLoadingQRCodes] = useState(true)
  const [formState, setFormState] = useState(buildFormState())
  const [deleteQRCodes, setDeleteQRCodes] = useState(false)
  const [reassignEmail, setReassignEmail] = useState("")
  const [savingUser, setSavingUser] = useState(false)
  const [deletingUser, setDeletingUser] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (open && userId) {
      loadUserData()
      loadUserQRCodes()
    }
  }, [open, userId])

  useEffect(() => {
    if (user) {
      setFormState(buildFormState(user))
      setDeleteQRCodes(false)
      setReassignEmail("")
    }
  }, [user])

  const loadUserData = async () => {
    if (!userId) return
    try {
      setLoading(true)
      setActionMessage(null)
      setActionError(null)
      const response = await adminApiClient.getUserById(userId)
      if (response.success) {
        setUser(response.data.user)
      }
    } catch (error) {
      console.error("Failed to load user:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserQRCodes = async () => {
    if (!userId) return
    try {
      setLoadingQRCodes(true)
      const response = await adminApiClient.getUserQRCodes(userId)
      if (response.success) {
        setQrCodes(response.data.qrCodes || [])
      }
    } catch (error) {
      console.error("Failed to load user QR codes:", error)
    } finally {
      setLoadingQRCodes(false)
    }
  }

  const handleFormFieldChange = (field: keyof typeof formState, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleStatsFieldChange = (field: keyof typeof formState.stats, value: number) => {
    setFormState((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        [field]: value,
      },
    }))
  }

  const handleSaveUser = async () => {
    if (!userId) return
    try {
      setSavingUser(true)
      setActionError(null)
      setActionMessage(null)

      const payload = {
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        role: formState.role,
        status: formState.status,
        isActive: formState.isActive,
        isEmailVerified: formState.isEmailVerified,
        stats: formState.stats,
      }

      const response = await adminApiClient.updateUser(userId, payload)
      if (response.success) {
        setActionMessage("User updated successfully")
        onUserUpdated?.()
        await loadUserData()
      }
    } catch (error: any) {
      setActionError(error?.message || "Failed to update user")
    } finally {
      setSavingUser(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!userId) return
    if (deleteQRCodes && reassignEmail.trim()) {
      setActionError("You cannot delete QR codes and reassign them at the same time.")
      return
    }
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }
    try {
      setDeletingUser(true)
      setActionError(null)
      setActionMessage(null)

      const payload: Record<string, any> = {}
      if (deleteQRCodes) {
        payload.deleteQRCodes = true
      } else if (reassignEmail.trim()) {
        payload.reassignQrToEmail = reassignEmail.trim()
      }

      const response = await adminApiClient.deleteUser(userId, payload)
      if (response.success) {
        setActionMessage("User deleted successfully")
        onUserDeleted?.()
      }
    } catch (error: any) {
      setActionError(error?.message || "Failed to delete user")
    } finally {
      setDeletingUser(false)
    }
  }

  if (!user && !loading) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details
          </DialogTitle>
          <DialogDescription>
            Complete information about this user and their QR codes
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : user && (
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-sm font-medium mt-1">{user.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm mt-1">{user.email}</p>
                  </div>
                  {user.phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-sm mt-1">{user.phone}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Role</label>
                    <p className="text-sm mt-1 capitalize">{user.role}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className="text-sm mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email Verified</label>
                    <p className="text-sm mt-1">
                      {user.isEmailVerified ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Verified
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                          Not Verified
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

        {/* Admin Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Controls</CardTitle>
            <CardDescription>Update profile details, status, and manage this account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {actionMessage && (
              <div className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-md p-2">
                {actionMessage}
              </div>
            )}
            {actionError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-2">
                {actionError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase text-gray-500">Name</Label>
                <Input
                  className="mt-1"
                  value={formState.name}
                  onChange={(e) => handleFormFieldChange("name", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs uppercase text-gray-500">Email</Label>
                <Input
                  className="mt-1"
                  value={formState.email}
                  onChange={(e) => handleFormFieldChange("email", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs uppercase text-gray-500">Phone</Label>
                <Input
                  className="mt-1"
                  value={formState.phone}
                  onChange={(e) => handleFormFieldChange("phone", e.target.value)}
                  placeholder="+27..."
                />
              </div>
              <div>
                <Label className="text-xs uppercase text-gray-500">Role</Label>
                <Select
                  value={formState.role}
                  onValueChange={(value) => handleFormFieldChange("role", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase text-gray-500">Status</Label>
                <Select
                  value={formState.status}
                  onValueChange={(value) => handleFormFieldChange("status", value)}
                >
                  <SelectTrigger className="mt-1">
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

            <div className="flex flex-wrap gap-4 text-sm text-gray-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={formState.isActive}
                  onChange={(e) => handleFormFieldChange("isActive", e.target.checked)}
                />
                Active Account
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={formState.isEmailVerified}
                  onChange={(e) => handleFormFieldChange("isEmailVerified", e.target.checked)}
                />
                Email Verified
              </label>
            </div>

            <div>
              <Label className="text-xs uppercase text-gray-500 block mb-3">Stats</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Total Items</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    value={formState.stats.totalItems}
                    onChange={(e) => handleStatsFieldChange("totalItems", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Total Pets</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    value={formState.stats.totalPets}
                    onChange={(e) => handleStatsFieldChange("totalPets", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Items Found</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    value={formState.stats.itemsFound}
                    onChange={(e) => handleStatsFieldChange("itemsFound", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Pets Found</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    value={formState.stats.petsFound}
                    onChange={(e) => handleStatsFieldChange("petsFound", Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label className="text-xs uppercase text-gray-500">QR Code Handling on Delete</Label>
              <label className="flex items-center gap-2 text-sm font-medium text-red-600">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={deleteQRCodes}
                  onChange={(e) => setDeleteQRCodes(e.target.checked)}
                />
                Delete all QR codes owned by this user
              </label>
              <p className="text-xs text-gray-500">
                Leave unchecked to preserve QR codes. Provide an email to reassign them before deleting the user.
              </p>
              <Input
                placeholder="Reassign QR codes to email"
                value={reassignEmail}
                onChange={(e) => setReassignEmail(e.target.value)}
                className="mt-1"
                disabled={deleteQRCodes}
              />
            </div>

            <div className="flex flex-wrap gap-3 justify-end">
              <Button variant="outline" onClick={handleSaveUser} disabled={savingUser}>
                {savingUser ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={handleDeleteUser}
                disabled={deletingUser}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                {deletingUser ? (
                  "Deleting..."
                ) : (
                  <span className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete User
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

            {/* Statistics */}
            {user.stats && (
              <Card>
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Total Items</label>
                      <p className="text-2xl font-bold mt-1">{user.stats.totalItems || 0}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Total Pets</label>
                      <p className="text-2xl font-bold mt-1">{user.stats.totalPets || 0}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Items Found</label>
                      <p className="text-2xl font-bold mt-1">{user.stats.itemsFound || 0}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Pets Found</label>
                      <p className="text-2xl font-bold mt-1">{user.stats.petsFound || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">Joined</label>
                      <p className="text-sm mt-1">{formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                  {user.lastLogin && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <label className="text-sm font-medium text-gray-500">Last Login</label>
                        <p className="text-sm mt-1">{formatDate(user.lastLogin)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* QR Codes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    QR Codes ({qrCodes.length})
                  </span>
                </CardTitle>
                <CardDescription>
                  All QR codes owned by this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingQRCodes ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : qrCodes.length === 0 ? (
                  <div className="text-center py-8">
                    <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No QR codes found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {qrCodes.map((qr) => (
                      <div key={qr._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{qr.details.name}</h4>
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium capitalize">
                                {qr.type}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                qr.status === 'active' ? 'bg-green-100 text-green-800' :
                                qr.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                qr.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {qr.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 font-mono mb-1">{qr.code}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {qr.scanCount} scans
                              </span>
                              <span>Created: {formatDate(qr.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

