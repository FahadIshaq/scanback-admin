"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, Package, Eye } from "lucide-react"
import adminApiClient from "@/lib/api"
import { ClientModal } from "@/components/client-modal"
import { ClientStockModal } from "@/components/client-stock-modal"

interface Client {
  _id: string
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  isActive: boolean
  createdAt: string
}

export function ClientsList() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [viewingStockFor, setViewingStockFor] = useState<Client | null>(null)

  const loadClients = useCallback(async () => {
    try {
      setLoading(true)
      const response = await adminApiClient.getAllClients()
      if (response.success) {
        setClients(response.data.clients)
      }
    } catch (error) {
      console.error("Failed to load clients:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEdit = (client: Client) => {
    setSelectedClient(client)
    setModalOpen(true)
  }

  const handleDelete = async (clientId: string) => {
    if (!confirm(`Are you sure you want to delete this client?`)) return
    
    try {
      await adminApiClient.deleteClient(clientId)
      loadClients()
    } catch (error) {
      console.error("Failed to delete client:", error)
      alert("Failed to delete client")
    }
  }

  const handleViewStock = (client: Client) => {
    setViewingStockFor(client)
    setStockModalOpen(true)
  }

  const handleCreateNew = () => {
    setSelectedClient(null)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clients Management</h2>
          <p className="text-gray-600">Manage clients and track stock allocations</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>Clients ({filteredClients.length})</CardTitle>
          <CardDescription>All registered clients in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No clients found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => (
                <div key={client._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{client.name}</h3>
                        {client.isActive ? (
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
                        {client.contactName && (
                          <div>
                            <span className="font-medium">Contact:</span> {client.contactName}
                          </div>
                        )}
                        {client.email && (
                          <div>
                            <span className="font-medium">Email:</span> {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div>
                            <span className="font-medium">Phone:</span> {client.phone}
                          </div>
                        )}
                        {client.address && (
                          <div>
                            <span className="font-medium">Address:</span> {client.address}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewStock(client)}
                        title="View Stock Balance"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(client)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(client._id)}
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

      {/* Client Modal */}
      <ClientModal
        client={selectedClient}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) {
            setSelectedClient(null)
          }
        }}
        onClientUpdated={loadClients}
      />

      {/* Stock Balance Modal */}
      <ClientStockModal
        client={viewingStockFor}
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

