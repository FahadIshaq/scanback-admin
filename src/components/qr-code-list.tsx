"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QrCode, Search, Filter, Download, Eye, MoreHorizontal } from "lucide-react"
import adminApiClient, { QRCode } from "@/lib/api"
import { formatDate } from "@/lib/utils"

export function QRCodeList() {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadQRCodes()
  }, [currentPage, typeFilter, statusFilter])

  const loadQRCodes = async () => {
    try {
      setLoading(true)
      const response = await adminApiClient.getAllQRCodes({
        page: currentPage,
        limit: 10,
        type: typeFilter !== "all" ? typeFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined
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
  }

  const filteredQRCodes = qrCodes.filter(qr => {
    const matchesSearch = qr.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         qr.details.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         qr.contact.email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

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
    return type === "pet" ? "🐕" : "📱"
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">QR Codes Management</h2>
        <p className="text-gray-600">View and manage all generated Item and Pet QR codes</p>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>QR Codes ({filteredQRCodes.length})</CardTitle>
              <CardDescription>
                All generated Item and Pet QR codes - users fill contact details when scanning
              </CardDescription>
            </div>
            <Button variant="outline">
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
          ) : filteredQRCodes.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No QR codes found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQRCodes.map((qr) => (
                <div key={qr._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="text-2xl">
                        {getTypeIcon(qr.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium text-gray-900">{qr.details.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(qr.status)}`}>
                            {qr.status}
                          </span>
                          {qr.isActivated && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              Activated
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Code: <span className="font-mono">{qr.code}</span>
                        </p>
                        <p className="text-sm text-gray-500 mb-2">
                          {qr.details.description || "No description"}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Owner: {qr.contact.email}</span>
                          <span>•</span>
                          <span>Scans: {qr.scanCount}</span>
                          <span>•</span>
                          <span>Created: {formatDate(qr.createdAt)}</span>
                          {qr.lastScanned && (
                            <>
                              <span>•</span>
                              <span>Last scanned: {formatDate(qr.lastScanned)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
    </div>
  )
}
