"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Edit, Trash2, Search, QrCode } from "lucide-react"
import adminApiClient, { QRCode } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { QRCodeEditModal } from "@/components/qr-code-edit-modal"
import { QRCodeDetailModal } from "@/components/qr-code-detail-modal"

interface SupplierQRCodesListProps {
  qrCodes: QRCode[]
  onQRCodeUpdated?: () => void
}

export function SupplierQRCodesList({ qrCodes, onQRCodeUpdated }: SupplierQRCodesListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedQRCode, setSelectedQRCode] = useState<QRCode | null>(null)
  const [editingQRCode, setEditingQRCode] = useState<QRCode | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const filteredQRCodes = qrCodes.filter(qr => {
    const matchesSearch = qr.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         qr.details?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (qr.contact as any)?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || qr.type === typeFilter
    const matchesStatus = statusFilter === "all" || qr.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

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
      onQRCodeUpdated?.()
    } catch (error) {
      console.error("Failed to delete QR code:", error)
      alert("Failed to delete QR code")
    }
  }

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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search QR codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
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
      </div>

      {/* QR Codes List */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned QR Codes ({filteredQRCodes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredQRCodes.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No QR codes found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQRCodes.map((qr) => (
                <div key={qr._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{getTypeIcon(qr.type)}</span>
                        <h3 className="font-semibold text-lg">{qr.details?.name || 'N/A'}</h3>
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
                      <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded block w-fit mb-2">{qr.code}</code>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Assigned:</span>
                          <div className="text-gray-900 font-medium mt-0.5">
                            {formatDate(qr.createdAt)}
                          </div>
                        </div>
                        {qr.isActivated && qr.activationDate && (
                          <div>
                            <span className="text-gray-500">Activated:</span>
                            <div className="text-gray-900 font-medium mt-0.5">
                              {formatDate(qr.activationDate)}
                            </div>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Scans:</span>
                          <div className="text-gray-900 font-medium mt-0.5 flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {qr.scanCount || 0}
                          </div>
                        </div>
                        {qr.lastScanned && (
                          <div>
                            <span className="text-gray-500">Last Scanned:</span>
                            <div className="text-gray-900 font-medium mt-0.5">
                              {formatDate(qr.lastScanned)}
                            </div>
                          </div>
                        )}
                      </div>

                      {qr.details?.description && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">{qr.details.description}</p>
                      )}

                      {typeof qr.owner === 'object' && qr.owner && qr.owner.email !== 'admin@scanback.co.za' && (
                        <div className="mt-2 text-xs">
                          <span className="text-gray-500">Owner:</span>
                          <span className="text-gray-900 font-medium ml-1">{qr.owner.name} ({qr.owner.email})</span>
                        </div>
                      )}
                      {(!qr.owner || (typeof qr.owner === 'object' && qr.owner.email === 'admin@scanback.co.za')) && (
                        <div className="mt-2 text-xs">
                          <span className="text-gray-500">Owner:</span>
                          <span className="text-gray-400 italic ml-1">Unassigned</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
        onQRCodeUpdated={onQRCodeUpdated}
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
        onQRCodeUpdated={onQRCodeUpdated}
      />
    </div>
  )
}

