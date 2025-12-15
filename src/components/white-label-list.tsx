"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Search, Edit, Trash2, Palette, Power, PowerOff } from "lucide-react"
import adminApiClient from "@/lib/api"
import { WhiteLabelModal } from "@/components/white-label-modal"

interface WhiteLabel {
  _id: string
  email: string
  logo: string
  brandName: string
  isActive: boolean
  createdAt: string
}

export function WhiteLabelList() {
  const [whiteLabels, setWhiteLabels] = useState<WhiteLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedWhiteLabel, setSelectedWhiteLabel] = useState<WhiteLabel | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const loadWhiteLabels = useCallback(async () => {
    try {
      setLoading(true)
      const response = await adminApiClient.getAllWhiteLabels({ 
        page: 1,
        limit: 100,
        search: searchTerm || undefined
      })
      if (response.success) {
        setWhiteLabels(response.data.whiteLabels || [])
      }
    } catch (error) {
      console.error("Failed to load white labels:", error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  useEffect(() => {
    loadWhiteLabels()
  }, [loadWhiteLabels])

  const handleCreateNew = () => {
    setSelectedWhiteLabel(null)
    setModalOpen(true)
  }

  const handleEdit = (whiteLabel: WhiteLabel) => {
    setSelectedWhiteLabel(whiteLabel)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this white label? This action cannot be undone.")) {
      return
    }
    
    try {
      const response = await adminApiClient.deleteWhiteLabel(id)
      if (response.success) {
        loadWhiteLabels()
      } else {
        alert(response.message || "Failed to delete white label")
      }
    } catch (error: any) {
      alert(error.message || "Failed to delete white label")
    }
  }

  const handleToggleStatus = async (id: string) => {
    try {
      const response = await adminApiClient.toggleWhiteLabelStatus(id)
      if (response.success) {
        loadWhiteLabels()
      } else {
        alert(response.message || "Failed to toggle white label status")
      }
    } catch (error: any) {
      alert(error.message || "Failed to toggle white label status")
    }
  }

  const filteredWhiteLabels = whiteLabels.filter(wl =>
    wl.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wl.brandName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">White Label Management</h2>
          <p className="text-gray-600 mt-1">Manage white label company configurations</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create White Label
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search white labels by email or brand name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* White Labels List */}
      <Card>
        <CardHeader>
          <CardTitle>White Labels</CardTitle>
          <CardDescription>
            {loading ? "Loading..." : `${filteredWhiteLabels.length} white label(s) found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 mt-2">Loading white labels...</p>
          ) : filteredWhiteLabels.length === 0 ? (
            <div className="text-center py-12">
              <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No white labels found</p>
              <Button onClick={handleCreateNew} className="mt-4">
                Create First White Label
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredWhiteLabels.map((whiteLabel) => (
                <div
                  key={whiteLabel._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    {whiteLabel.logo && (
                      <div className="flex-shrink-0">
                        <img
                          src={whiteLabel.logo}
                          alt={whiteLabel.brandName}
                          className="h-12 w-12 object-contain rounded border bg-white p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {whiteLabel.brandName}
                        </h3>
                        {whiteLabel.isActive ? (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-800 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{whiteLabel.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(whiteLabel._id)}
                      title={whiteLabel.isActive ? "Deactivate" : "Activate"}
                    >
                      {whiteLabel.isActive ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(whiteLabel)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(whiteLabel._id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <WhiteLabelModal
        whiteLabel={selectedWhiteLabel}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) {
            setSelectedWhiteLabel(null)
          }
        }}
        onWhiteLabelUpdated={() => {
          setSelectedWhiteLabel(null)
          loadWhiteLabels()
        }}
      />
    </div>
  )
}

