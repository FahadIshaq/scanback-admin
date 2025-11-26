"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QrCode, Search, Filter, Download, Eye, MoreHorizontal, User, Trash2, Edit } from "lucide-react"
import adminApiClient, { QRCode } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { QRCodeDetailModal } from "@/components/qr-code-detail-modal"
import { QRCodeEditModal } from "@/components/qr-code-edit-modal"

export function QRCodeList() {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedQRCode, setSelectedQRCode] = useState<QRCode | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [editingQRCode, setEditingQRCode] = useState<QRCode | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // 500ms delay

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm])

  const loadQRCodes = useCallback(async () => {
    try {
      setLoading(true)
      const response = await adminApiClient.getAllQRCodes({
        page: currentPage,
        limit: 10,
        type: typeFilter !== "all" ? typeFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: debouncedSearchTerm.trim() || undefined
      })
      
      if (response.success) {
        setQrCodes(response.data.qrCodes)
        setTotalPages(response.data.totalPages)
      }
    } catch (error) {
      console.error("Failed to load QR codes:", error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, typeFilter, statusFilter, debouncedSearchTerm])

  useEffect(() => {
    loadQRCodes()
  }, [loadQRCodes])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800"
      case "inactive": return "bg-gray-100 text-gray-800"
      case "suspended": return "bg-yellow-100 text-yellow-800"
      case "found": return "bg-blue-100 text-blue-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pet": return "🐕"
      case "emergency": return "🚨"
      default: return "📱"
    }
  }

  const handleViewDetails = async (qr: QRCode) => {
    try {
      const response = await adminApiClient.getQRCodeByCode(qr.code)
      if (response.success) {
        setSelectedQRCode(response.data.qrCode)
        setDetailModalOpen(true)
      }
    } catch (error) {
      console.error("Failed to load QR code details:", error)
    }
  }

  const handleEditQRCode = async (qr: QRCode) => {
    try {
      const response = await adminApiClient.getQRCodeByCode(qr.code)
      if (response.success) {
        setEditingQRCode(response.data.qrCode)
        setEditModalOpen(true)
      }
    } catch (error) {
      console.error("Failed to load QR code for editing:", error)
    }
  }

  const handleDeleteQRCode = async (code: string) => {
    if (!confirm(`Are you sure you want to delete QR code ${code}?`)) return
    
    try {
      await adminApiClient.deleteQRCode(code)
      loadQRCodes()
    } catch (error) {
      console.error("Failed to delete QR code:", error)
      alert("Failed to delete QR code")
    }
  }

  const handleStatusChange = async (code: string, newStatus: string) => {
    try {
      await adminApiClient.updateQRCodeStatus(code, newStatus)
      loadQRCodes()
    } catch (error) {
      console.error("Failed to update QR code status:", error)
      alert("Failed to update QR code status")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">QR Codes Management</h2>
        <p className="text-gray-600">View and manage all generated Item, Pet, and Emergency QR codes</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search QR codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="item">Items</SelectItem>
                <SelectItem value="pet">Pets</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="found">Found</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadQRCodes}>
              <Filter className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Codes List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>QR Codes ({qrCodes.length})</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                All generated Item, Pet, and Emergency QR codes - users fill contact details when scanning
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : qrCodes.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No QR codes found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">QR Code</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Owner</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Contact</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Activated</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Scans</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Created</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Last Scanned</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {qrCodes.map((qr) => (
                      <tr key={qr._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{getTypeIcon(qr.type)}</span>
                            <span className="text-xs font-medium capitalize text-gray-700">{qr.type}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{qr.code}</code>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-sm text-gray-900">{qr.details?.name || 'N/A'}</div>
                          {qr.details?.category && (
                            <div className="text-xs text-gray-500 mt-1">Category: {qr.details.category}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs text-gray-600 max-w-xs truncate">
                            {qr.details?.description || 'No description'}
                          </div>
                          {qr.type === 'item' && (
                            <div className="text-xs text-gray-500 mt-1">
                              {qr.details?.brand && `Brand: ${qr.details.brand}`}
                              {qr.details?.model && ` • Model: ${qr.details.model}`}
                            </div>
                          )}
                          {qr.type === 'pet' && (
                            <div className="text-xs text-gray-500 mt-1">
                              {qr.details?.breed && `Breed: ${qr.details.breed}`}
                              {qr.details?.species && ` • Species: ${qr.details.species}`}
                            </div>
                          )}
                          {qr.type === 'emergency' && (
                            <div className="text-xs text-gray-500 mt-1">
                              {qr.details?.bloodType && `Blood Type: ${qr.details.bloodType}`}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {typeof qr.owner === 'object' && qr.owner && qr.owner.email !== 'admin@scanback.co.za' ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">{qr.owner.name}</div>
                              <div className="text-xs text-gray-500">{qr.owner.email}</div>
                              {qr.owner.phone && (
                                <div className="text-xs text-gray-500">{qr.owner.phone}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs">
                            <div className="text-gray-900">{qr.contact?.name || 'N/A'}</div>
                            <div className="text-gray-600">{qr.contact?.email || 'N/A'}</div>
                            <div className="text-gray-600">
                              {(qr.contact as any)?.countryCode || ''}{qr.contact?.phone || 'N/A'}
                            </div>
                            {(qr.contact as any)?.backupPhone && (
                              <div className="text-gray-500 mt-1">
                                Backup: {(qr.contact as any)?.backupCountryCode || ''}{(qr.contact as any)?.backupPhone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <Select
                              value={qr.status}
                              onValueChange={(value) => handleStatusChange(qr.code, value)}
                            >
                              <SelectTrigger className="w-28 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="found">Found</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {qr.isActivated ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
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
                            <Eye className="h-3 w-3 text-gray-400" />
                            <span className="font-semibold text-sm">{qr.scanCount || 0}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs text-gray-600">
                            {formatDate(qr.createdAt)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {qr.lastScanned ? (
                            <div className="text-xs text-gray-600">
                              {formatDate(qr.lastScanned)}
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
                              onClick={() => handleViewDetails(qr)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditQRCode(qr)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDeleteQRCode(qr.code)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
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
                {qrCodes.map((qr) => (
                  <div key={qr._id} className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-2xl">{getTypeIcon(qr.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-medium text-gray-900 text-sm">{qr.details?.name || 'N/A'}</h3>
                            <span className="text-xs font-medium capitalize text-gray-600">{qr.type}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(qr.status)}`}>
                              {qr.status}
                            </span>
                            {qr.isActivated && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                Activated
                              </span>
                            )}
                          </div>
                          <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded block w-fit">{qr.code}</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewDetails(qr)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditQRCode(qr)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteQRCode(qr.code)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {qr.details?.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">{qr.details.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500">Owner:</span>
                        <div className="text-gray-900 font-medium mt-0.5">
                          {typeof qr.owner === 'object' && qr.owner && qr.owner.email !== 'admin@scanback.co.za' 
                            ? qr.owner.name 
                            : 'Unassigned'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Contact:</span>
                        <div className="text-gray-900 font-medium mt-0.5 truncate">
                          {qr.contact?.name || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Scans:</span>
                        <div className="text-gray-900 font-medium mt-0.5 flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {qr.scanCount || 0}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <div className="text-gray-900 font-medium mt-0.5 text-xs">
                          {formatDate(qr.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <Select
                        value={qr.status}
                        onValueChange={(value) => handleStatusChange(qr.code, value)}
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="found">Found</SelectItem>
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

      {/* QR Code Detail Modal */}
      <QRCodeDetailModal
        qrCode={selectedQRCode}
        open={detailModalOpen}
        onOpenChange={(open) => {
          setDetailModalOpen(open)
          if (!open) {
            setSelectedQRCode(null)
          }
        }}
        onQRCodeUpdated={loadQRCodes}
      />

      {/* QR Code Edit Modal */}
      <QRCodeEditModal
        qrCode={editingQRCode}
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open)
          if (!open) {
            setEditingQRCode(null)
          }
        }}
        onQRCodeUpdated={loadQRCodes}
      />
    </div>
  )
}
