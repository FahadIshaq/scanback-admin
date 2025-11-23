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
import { formatDate } from "@/lib/utils"
import { User, Mail, Phone, Calendar, QrCode, Eye } from "lucide-react"
import adminApiClient, { QRCode } from "@/lib/api"

interface UserDetailModalProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
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

export function UserDetailModal({ userId, open, onOpenChange }: UserDetailModalProps) {
  const [user, setUser] = useState<UserData | null>(null)
  const [qrCodes, setQrCodes] = useState<QRCode[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingQRCodes, setLoadingQRCodes] = useState(true)

  useEffect(() => {
    if (open && userId) {
      loadUserData()
      loadUserQRCodes()
    }
  }, [open, userId])

  const loadUserData = async () => {
    if (!userId) return
    try {
      setLoading(true)
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

