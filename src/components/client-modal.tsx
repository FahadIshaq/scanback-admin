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

interface Client {
  _id: string
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  isActive: boolean
}

interface ClientModalProps {
  client: Client | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientUpdated?: () => void
}

export function ClientModal({ client, open, onOpenChange, onClientUpdated }: ClientModalProps) {
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
    if (client) {
      setFormData({
        name: client.name || "",
        contactName: client.contactName || "",
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        isActive: client.isActive ?? true,
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
  }, [client])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      if (!formData.name.trim()) {
        setError("Client name is required")
        return
      }

      if (client) {
        // Update existing client
        const response = await adminApiClient.updateClient(client._id, formData)
        if (response.success) {
          setSuccess("Client updated successfully!")
          onClientUpdated?.()
          setTimeout(() => {
            onOpenChange(false)
          }, 1500)
        } else {
          setError(response.message || "Failed to update client")
        }
      } else {
        // Create new client
        const response = await adminApiClient.createClient(formData)
        if (response.success) {
          setSuccess("Client created successfully!")
          onClientUpdated?.()
          setTimeout(() => {
            onOpenChange(false)
          }, 1500)
        } else {
          setError(response.message || "Failed to create client")
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to save client")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {client ? "Edit Client" : "Create New Client"}
          </DialogTitle>
          <DialogDescription>
            {client ? "Update client information" : "Add a new client to the system"}
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
            <Label htmlFor="name">Client Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter client name"
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
                placeholder="client@example.com"
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
              placeholder="Enter client address"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked as boolean }))}
            />
            <Label htmlFor="isActive">Active Client</Label>
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

