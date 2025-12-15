"use client"

import { useEffect, useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import adminApiClient from "@/lib/api"
import { Save, Loader2, Upload } from "lucide-react"

interface WhiteLabel {
  _id: string
  email: string
  logo: string
  brandName: string
  website?: string
  isActive: boolean
}

interface WhiteLabelModalProps {
  whiteLabel: WhiteLabel | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onWhiteLabelUpdated?: () => void
}

export function WhiteLabelModal({ whiteLabel, open, onOpenChange, onWhiteLabelUpdated }: WhiteLabelModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [creatingAdmin, setCreatingAdmin] = useState(false)
  const [loadingAdmins, setLoadingAdmins] = useState(false)
  const [existingAdmins, setExistingAdmins] = useState<any[]>([])
  const [adminFormData, setAdminFormData] = useState({
    email: "",
    password: "",
    name: "",
  })

  const [formData, setFormData] = useState({
    email: "",
    logo: "",
    brandName: "",
    website: "",
    isActive: true,
  })

  useEffect(() => {
    if (whiteLabel) {
      setFormData({
        email: whiteLabel.email || "",
        logo: whiteLabel.logo || "",
        brandName: whiteLabel.brandName || "",
        website: whiteLabel.website || "",
        isActive: whiteLabel.isActive ?? true,
      })
      loadExistingAdmins()
    } else {
      setFormData({
        email: "",
        logo: "",
        brandName: "",
        website: "",
        isActive: true,
      })
      setExistingAdmins([])
    }
    setError(null)
    setSuccess(null)
  }, [whiteLabel])

  const loadExistingAdmins = async () => {
    if (!whiteLabel?._id) return
    
    try {
      setLoadingAdmins(true)
      const response = await adminApiClient.getWhiteLabelAdmins(whiteLabel._id)
      if (response.success) {
        setExistingAdmins(response.data.admins || [])
      }
    } catch (error) {
      console.error("Failed to load admins:", error)
    } finally {
      setLoadingAdmins(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    try {
      setUploadingLogo(true)
      setError(null)
      const response = await adminApiClient.uploadImage(file, 'white-labels')
      if (response.success && response.url) {
        setFormData(prev => ({ ...prev, logo: response.url! }))
      } else {
        setError(response.message || "Failed to upload logo")
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload logo")
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      if (!formData.email.trim()) {
        setError("Email is required")
        return
      }

      if (!formData.logo.trim()) {
        setError("Logo is required")
        return
      }

      if (!formData.brandName.trim()) {
        setError("Brand name is required")
        return
      }

      if (!formData.website.trim()) {
        setError("Website is required")
        return
      }

      if (whiteLabel) {
        // Update existing white label
        const response = await adminApiClient.updateWhiteLabel(whiteLabel._id, formData)
        if (response.success) {
          setSuccess("White label updated successfully!")
          onWhiteLabelUpdated?.()
          setTimeout(() => {
            onOpenChange(false)
          }, 1500)
        } else {
          setError(response.message || "Failed to update white label")
        }
      } else {
        // Create new white label
        const response = await adminApiClient.createWhiteLabel(formData)
        if (response.success) {
          setSuccess("White label created successfully!")
          onWhiteLabelUpdated?.()
          setTimeout(() => {
            onOpenChange(false)
          }, 1500)
        } else {
          setError(response.message || "Failed to create white label")
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to save white label")
    } finally {
      setSaving(false)
    }
  }

  const handleCreateAdmin = async () => {
    if (!whiteLabel?._id) {
      setError("Please save the white label first before creating an admin user")
      return
    }

    try {
      setCreatingAdmin(true)
      setError(null)
      setSuccess(null)

      if (!adminFormData.email.trim() || !adminFormData.password.trim() || !adminFormData.name.trim()) {
        setError("All fields are required")
        return
      }

      if (adminFormData.password.length < 6) {
        setError("Password must be at least 6 characters")
        return
      }

      const response = await adminApiClient.createWhiteLabelAdmin({
        whiteLabelId: whiteLabel._id,
        email: adminFormData.email,
        password: adminFormData.password,
        name: adminFormData.name,
      })

      if (response.success) {
        setSuccess("White-label admin user created successfully!")
        setAdminFormData({ email: "", password: "", name: "" })
        setShowAdminForm(false)
        loadExistingAdmins() // Reload the list
      } else {
        setError(response.message || "Failed to create admin user")
      }
    } catch (err: any) {
      setError(err.message || "Failed to create admin user")
    } finally {
      setCreatingAdmin(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {whiteLabel ? "Edit White Label" : "Create New White Label"}
          </DialogTitle>
          <DialogDescription>
            {whiteLabel ? "Update white label company information" : "Add a new white label company"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              {success}
            </div>
          )}

              <div>
            <Label htmlFor="email">Email *</Label>
                <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="company@example.com"
                />
              </div>

              <div>
                <Label htmlFor="brandName">Brand Name *</Label>
                <Input
                  id="brandName"
                  value={formData.brandName}
                  onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
              placeholder="Enter brand name"
                />
              </div>

              <div>
            <Label htmlFor="website">Website *</Label>
                <Input
                  id="website"
              type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://company-website.com"
                />
          </div>

              <div>
            <Label htmlFor="logo">Logo *</Label>
            <div className="space-y-2">
                  {formData.logo && (
                <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={formData.logo}
                        alt="Logo preview"
                    className="w-full h-full object-contain"
                  />
                    </div>
                  )}
              <div className="flex items-center gap-2">
                <Input
                  id="logo"
                  type="text"
                  value={formData.logo}
                  onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                  placeholder="Logo URL or upload image"
                  className="flex-1"
                />
                    <input
                  ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleLogoUpload(file)
                    }
                  }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                  size="sm"
                      disabled={uploadingLogo}
                  className="whitespace-nowrap"
                  onClick={() => {
                    fileInputRef.current?.click()
                  }}
                    >
                      {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                    <>
                        <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                    </Button>
              </div>
              <p className="text-xs text-gray-500">
                Enter a logo URL or upload an image file
              </p>
                </div>
              </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked as boolean }))}
            />
            <Label htmlFor="isActive">Active</Label>
              </div>

          {whiteLabel && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Admin Users</h3>
                  <p className="text-sm text-gray-500">Manage admin users for this white-label company</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdminForm(!showAdminForm)}
                >
                  {showAdminForm ? "Hide" : "Create Admin"}
                </Button>
              </div>

              {/* Existing Admins List */}
              {loadingAdmins ? (
                <div className="text-center py-4 text-sm text-gray-500">Loading admins...</div>
              ) : existingAdmins.length > 0 ? (
                <div className="mb-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Existing Admin Users:</p>
                  {existingAdmins.map((admin: any) => (
                    <div key={admin._id} className="bg-gray-50 border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{admin.name}</p>
                        <p className="text-xs text-gray-500">{admin.email}</p>
                        {admin.whiteLabelId && typeof admin.whiteLabelId === 'object' && (
                          <p className="text-xs text-gray-400">{admin.whiteLabelId.brandName}</p>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {admin.lastLogin ? `Last login: ${new Date(admin.lastLogin).toLocaleDateString()}` : 'Never logged in'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4 text-sm text-gray-500">No admin users created yet.</div>
              )}

              {showAdminForm && (
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div>
                    <Label htmlFor="adminEmail">Admin Email *</Label>
                <Input
                      id="adminEmail"
                  type="email"
                      value={adminFormData.email}
                      onChange={(e) => setAdminFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="admin@example.com"
                />
              </div>

              <div>
                    <Label htmlFor="adminName">Admin Name *</Label>
                <Input
                      id="adminName"
                      value={adminFormData.name}
                      onChange={(e) => setAdminFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Admin Name"
                />
              </div>

              <div>
                    <Label htmlFor="adminPassword">Password *</Label>
                <Input
                      id="adminPassword"
                      type="password"
                      value={adminFormData.password}
                      onChange={(e) => setAdminFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Minimum 6 characters"
                />
              </div>

                  <Button
                    type="button"
                    onClick={handleCreateAdmin}
                    disabled={creatingAdmin}
                    className="w-full"
                  >
                    {creatingAdmin ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Admin User"
                    )}
                  </Button>
              </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || uploadingLogo}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

