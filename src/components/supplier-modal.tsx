"use client"

import { useEffect, useState } from "react"
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
import { Save, Loader2 } from "lucide-react"

interface Supplier {
  _id: string
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  isActive: boolean
}

interface SupplierModalProps {
  supplier: Supplier | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSupplierUpdated?: () => void
}

export function SupplierModal({ supplier, open, onOpenChange, onSupplierUpdated }: SupplierModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    isActive: true,
  })

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || "",
        contactName: supplier.contactName || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        isActive: supplier.isActive ?? true,
      })
    } else {
      setFormData({
        name: "",
        contactName: "",
        email: "",
        phone: "",
        address: "",
        isActive: true,
      })
    }
    setError(null)
    setSuccess(null)
  }, [supplier])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      if (!formData.name.trim()) {
        setError("Supplier name is required")
        return
      }

      if (supplier) {
        // Update existing supplier
        const response = await adminApiClient.updateSupplier(supplier._id, formData)
        if (response.success) {
          setSuccess("Supplier updated successfully!")
          onSupplierUpdated?.()
          setTimeout(() => {
            onOpenChange(false)
          }, 1500)
        } else {
          setError(response.message || "Failed to update supplier")
        }
      } else {
        // Create new supplier
        const response = await adminApiClient.createSupplier(formData)
        if (response.success) {
          setSuccess("Supplier created successfully!")
          onSupplierUpdated?.()
          setTimeout(() => {
            onOpenChange(false)
          }, 1500)
        } else {
          setError(response.message || "Failed to create supplier")
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to save supplier")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {supplier ? "Edit Supplier" : "Create New Supplier"}
          </DialogTitle>
          <DialogDescription>
            {supplier ? "Update supplier information" : "Add a new supplier to the system"}
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
            <Label htmlFor="name">Supplier Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter supplier name"
            />
          </div>

          <div>
            <Label htmlFor="contactName">Contact Name</Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
              placeholder="Enter contact person name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="supplier@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+27 82 123 4567"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter supplier address"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked as boolean }))}
            />
            <Label htmlFor="isActive">Active Supplier</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
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

