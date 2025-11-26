"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, Package, Eye } from "lucide-react"
import adminApiClient from "@/lib/api"
import { SupplierModal } from "@/components/supplier-modal"
import { SupplierStockModal } from "@/components/supplier-stock-modal"

interface Supplier {
  _id: string
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  isActive: boolean
  createdAt: string
}

export function SuppliersList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [viewingStockFor, setViewingStockFor] = useState<Supplier | null>(null)

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await adminApiClient.getAllSuppliers()
      if (response.success) {
        setSuppliers(response.data.suppliers)
      }
    } catch (error) {
      console.error("Failed to load suppliers:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setModalOpen(true)
  }

  const handleDelete = async (supplierId: string) => {
    if (!confirm(`Are you sure you want to delete this supplier?`)) return
    
    try {
      await adminApiClient.deleteSupplier(supplierId)
      loadSuppliers()
    } catch (error) {
      console.error("Failed to delete supplier:", error)
      alert("Failed to delete supplier")
    }
  }

  const handleViewStock = (supplier: Supplier) => {
    setViewingStockFor(supplier)
    setStockModalOpen(true)
  }

  const handleCreateNew = () => {
    setSelectedSupplier(null)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Suppliers Management</h2>
          <p className="text-gray-600">Manage suppliers and track stock allocations</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Suppliers List */}
      <Card>
        <CardHeader>
          <CardTitle>Suppliers ({filteredSuppliers.length})</CardTitle>
          <CardDescription>All registered suppliers in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No suppliers found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSuppliers.map((supplier) => (
                <div key={supplier._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{supplier.name}</h3>
                        {supplier.isActive ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        {supplier.contactName && (
                          <div>
                            <span className="font-medium">Contact:</span> {supplier.contactName}
                          </div>
                        )}
                        {supplier.email && (
                          <div>
                            <span className="font-medium">Email:</span> {supplier.email}
                          </div>
                        )}
                        {supplier.phone && (
                          <div>
                            <span className="font-medium">Phone:</span> {supplier.phone}
                          </div>
                        )}
                        {supplier.address && (
                          <div>
                            <span className="font-medium">Address:</span> {supplier.address}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewStock(supplier)}
                        title="View Stock Balance"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(supplier)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(supplier._id)}
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

      {/* Supplier Modal */}
      <SupplierModal
        supplier={selectedSupplier}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) {
            setSelectedSupplier(null)
          }
        }}
        onSupplierUpdated={loadSuppliers}
      />

      {/* Stock Balance Modal */}
      <SupplierStockModal
        supplier={viewingStockFor}
        open={stockModalOpen}
        onOpenChange={(open) => {
          setStockModalOpen(open)
          if (!open) {
            setViewingStockFor(null)
          }
        }}
      />
    </div>
  )
}

