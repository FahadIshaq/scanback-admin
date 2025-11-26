"use client"

import { useEffect, useState } from "react"
import { QRCode } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate } from "@/lib/utils"
import adminApiClient from "@/lib/api"
import { 
  QrCode, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Eye, 
  MapPin, 
  Settings, 
  Package,
  Heart,
  AlertCircle,
  DollarSign,
  Tag,
  Info,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3
} from "lucide-react"

interface QRCodeDetailModalProps {
  qrCode: QRCode | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onQRCodeUpdated?: () => void
}

export function QRCodeDetailModal({ qrCode: qrCodeProp, open, onOpenChange, onQRCodeUpdated }: QRCodeDetailModalProps) {
  const [editableQr, setEditableQr] = useState<QRCode | null>(qrCodeProp)
  const [detailsJson, setDetailsJson] = useState("")
  const [contactJson, setContactJson] = useState("")
  const [settingsJson, setSettingsJson] = useState("")
  const [typeValue, setTypeValue] = useState<QRCode["type"]>("item")
  const [statusValue, setStatusValue] = useState<QRCode["status"]>("active")
  const [ownerIdInput, setOwnerIdInput] = useState("")
  const [ownerEmailInput, setOwnerEmailInput] = useState("")
  const [savingDetails, setSavingDetails] = useState(false)
  const [savingOwner, setSavingOwner] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (qrCodeProp) {
      setEditableQr(qrCodeProp)
      setDetailsJson(JSON.stringify(qrCodeProp.details || {}, null, 2))
      setContactJson(JSON.stringify(qrCodeProp.contact || {}, null, 2))
      setSettingsJson(JSON.stringify((qrCodeProp as any).settings || {}, null, 2))
      setTypeValue(qrCodeProp.type)
      setStatusValue(qrCodeProp.status)
      setOwnerIdInput(
        typeof qrCodeProp.owner === "object"
          ? (qrCodeProp.owner as any)?._id || ""
          : typeof qrCodeProp.owner === "string"
            ? qrCodeProp.owner
            : ""
      )
      setOwnerEmailInput(
        typeof qrCodeProp.owner === "object"
          ? qrCodeProp.owner?.email || ""
          : ""
      )
      setFeedbackMessage(null)
      setErrorMessage(null)
    } else {
      setEditableQr(null)
    }
  }, [qrCodeProp])

  const qrCode = editableQr ?? qrCodeProp
  if (!qrCode) return null

  const owner = typeof qrCode.owner === "object" ? qrCode.owner : null

  const refreshQRCode = async () => {
    try {
      const response = await adminApiClient.getQRCodeByCode(qrCode.code)
      if (response.success) {
        const fresh = response.data.qrCode
        setEditableQr(fresh)
        setDetailsJson(JSON.stringify(fresh.details || {}, null, 2))
        setContactJson(JSON.stringify(fresh.contact || {}, null, 2))
        setSettingsJson(JSON.stringify((fresh as any).settings || {}, null, 2))
        setTypeValue(fresh.type)
        setStatusValue(fresh.status)
        setOwnerIdInput(
          typeof fresh.owner === "object"
            ? (fresh.owner as any)?._id || ""
            : typeof fresh.owner === "string"
              ? fresh.owner
              : ""
        )
        setOwnerEmailInput(
          typeof fresh.owner === "object"
            ? fresh.owner?.email || ""
            : ""
        )
        onQRCodeUpdated?.()
      }
    } catch (error) {
      console.error("Failed to refresh QR code:", error)
    }
  }

  const parseJsonField = (label: string, value: string) => {
    if (!value.trim()) return undefined
    try {
      return JSON.parse(value)
    } catch (error) {
      throw new Error(`${label} JSON is invalid`)
    }
  }

  const handleSaveQRCode = async () => {
    try {
      setSavingDetails(true)
      setErrorMessage(null)
      setFeedbackMessage(null)

      const payload: Record<string, any> = {
        type: typeValue,
        status: statusValue,
      }

      const parsedDetails = parseJsonField("Details", detailsJson)
      const parsedContact = parseJsonField("Contact", contactJson)
      const parsedSettings = parseJsonField("Settings", settingsJson)

      if (parsedDetails) payload.details = parsedDetails
      if (parsedContact) payload.contact = parsedContact
      if (parsedSettings) payload.settings = parsedSettings

      const response = await adminApiClient.updateQRCode(qrCode.code, payload)
      if (response.success) {
        setFeedbackMessage("QR code updated successfully")
        await refreshQRCode()
      }
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to update QR code")
    } finally {
      setSavingDetails(false)
    }
  }

  const handleAssignOwner = async () => {
    if (!ownerIdInput && !ownerEmailInput) {
      setErrorMessage("Provide an owner ID or email address")
      return
    }

    try {
      setSavingOwner(true)
      setErrorMessage(null)
      setFeedbackMessage(null)

      const response = await adminApiClient.updateQRCodeOwner(qrCode.code, {
        ownerId: ownerIdInput || undefined,
        ownerEmail: ownerEmailInput || undefined,
      })

      if (response.success) {
        setFeedbackMessage("Owner updated successfully")
        await refreshQRCode()
      }
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to update QR owner")
    } finally {
      setSavingOwner(false)
    }
  }

  const handleClearOwner = async () => {
    try {
      setSavingOwner(true)
      setErrorMessage(null)
      setFeedbackMessage(null)

      const response = await adminApiClient.updateQRCodeOwner(qrCode.code, { clearOwner: true })
      if (response.success) {
        setFeedbackMessage("Owner removed successfully")
        await refreshQRCode()
      }
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to clear QR owner")
    } finally {
      setSavingOwner(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Complete QR Code Information
          </DialogTitle>
          <DialogDescription>
            All details and information for QR Code: <code className="font-mono text-xs">{qrCode.code}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">QR Code</label>
                  <p className="text-sm font-mono mt-1 bg-gray-100 px-2 py-1 rounded">{qrCode.code}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</label>
                  <p className="text-sm mt-1 capitalize font-medium">{qrCode.type}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                  <p className="text-sm mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      qrCode.status === 'active' ? 'bg-green-100 text-green-800' :
                      qrCode.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      qrCode.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {qrCode.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activated</label>
                  <p className="text-sm mt-1">
                    {qrCode.isActivated ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        <CheckCircle className="h-3 w-3" />
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                        <XCircle className="h-3 w-3" />
                        No
                      </span>
                    )}
                  </p>
                </div>
                {(qrCode as any).activationDate && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activation Date</label>
                    <p className="text-sm mt-1">{formatDate((qrCode as any).activationDate)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        {/* Admin Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Admin Controls
            </CardTitle>
            <CardDescription>Update QR code metadata, details, and ownership</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {feedbackMessage && (
              <div className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-md p-2">
                {feedbackMessage}
              </div>
            )}
            {errorMessage && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-2">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase text-gray-500">Type</Label>
                <Select value={typeValue} onValueChange={(value) => setTypeValue(value as QRCode["type"])}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="item">Item</SelectItem>
                    <SelectItem value="pet">Pet</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="any">Any</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase text-gray-500">Status</Label>
                <Select value={statusValue} onValueChange={(value) => setStatusValue(value as QRCode["status"])}>
                  <SelectTrigger className="mt-1">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase text-gray-500">Assign Owner (User ID)</Label>
                <Input
                  value={ownerIdInput}
                  onChange={(e) => setOwnerIdInput(e.target.value)}
                  placeholder="Optional user Mongo ID"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase text-gray-500">Assign Owner (Email)</Label>
                <Input
                  value={ownerEmailInput}
                  onChange={(e) => setOwnerEmailInput(e.target.value)}
                  placeholder="user@example.com"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleAssignOwner} disabled={savingOwner}>
                {savingOwner ? "Assigning..." : "Assign Owner"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearOwner} disabled={savingOwner}>
                {savingOwner ? "Clearing..." : "Clear Owner"}
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase text-gray-500">Details JSON</Label>
                <textarea
                  className="mt-1 w-full min-h-[120px] rounded-md border border-gray-200 bg-white p-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={detailsJson}
                  onChange={(e) => setDetailsJson(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs uppercase text-gray-500">Contact JSON</Label>
                <textarea
                  className="mt-1 w-full min-h-[120px] rounded-md border border-gray-200 bg-white p-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={contactJson}
                  onChange={(e) => setContactJson(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs uppercase text-gray-500">Settings JSON</Label>
                <textarea
                  className="mt-1 w-full min-h-[120px] rounded-md border border-gray-200 bg-white p-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={settingsJson}
                  onChange={(e) => setSettingsJson(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveQRCode} disabled={savingDetails}>
                {savingDetails ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

          {/* Owner Information */}
        {owner && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Owner Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
              {(owner as any)?._id && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <span className="font-mono text-xs">ID: {(owner as any)._id}</span>
                </div>
              )}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{owner.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{owner.email}</span>
                </div>
                {owner.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{owner.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Details - Type Specific */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {qrCode.type === 'item' && <Package className="h-5 w-5" />}
                {qrCode.type === 'pet' && <Heart className="h-5 w-5" />}
                {qrCode.type === 'emergency' && <AlertCircle className="h-5 w-5" />}
                Details Information
              </CardTitle>
              <CardDescription>All details specific to {qrCode.type} type QR code</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</label>
                    <p className="text-sm mt-1 font-medium">{qrCode.details?.name || 'N/A'}</p>
                  </div>
                  {qrCode.details?.description && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
                    <p className="text-sm mt-1">{qrCode.details.description}</p>
                  </div>
                )}
                </div>

                {/* Item Specific Fields */}
                {qrCode.type === 'item' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</label>
                      <p className="text-sm mt-1">{qrCode.details?.category || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Brand</label>
                      <p className="text-sm mt-1">{qrCode.details?.brand || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Model</label>
                      <p className="text-sm mt-1">{qrCode.details?.model || 'N/A'}</p>
                    </div>
                      <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Color</label>
                      <p className="text-sm mt-1">{qrCode.details?.color || 'N/A'}</p>
                      </div>
                      <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Serial Number</label>
                      <p className="text-sm mt-1 font-mono">{qrCode.details?.serialNumber || 'N/A'}</p>
                      </div>
                    {qrCode.details?.value && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Value
                        </label>
                        <p className="text-sm mt-1">${qrCode.details.value.toLocaleString()}</p>
                      </div>
                    )}
                    {qrCode.details?.purchaseDate && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Purchase Date</label>
                        <p className="text-sm mt-1">{formatDate(qrCode.details.purchaseDate)}</p>
                      </div>
                    )}
                    {qrCode.details?.warrantyExpiry && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Warranty Expiry</label>
                        <p className="text-sm mt-1">{formatDate(qrCode.details.warrantyExpiry)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Pet Specific Fields */}
                {qrCode.type === 'pet' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Species</label>
                      <p className="text-sm mt-1">{qrCode.details?.species || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Breed</label>
                      <p className="text-sm mt-1">{qrCode.details?.breed || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Age</label>
                      <p className="text-sm mt-1">{qrCode.details?.age ? `${qrCode.details.age} ${qrCode.details.age === 1 ? 'year' : 'years'}` : 'N/A'}</p>
                    </div>
                      <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Microchip ID</label>
                      <p className="text-sm mt-1 font-mono">{qrCode.details?.microchipId || 'N/A'}</p>
                    </div>
                    {(qrCode.details as any)?.image && (
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Image</label>
                        <p className="text-sm mt-1 text-blue-600">Image available</p>
                      </div>
                    )}
                    {(qrCode.details as any)?.emergencyDetails && (
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Emergency Details</label>
                        <p className="text-sm mt-1">{(qrCode.details as any).emergencyDetails}</p>
                      </div>
                    )}
                    {(qrCode.details as any)?.pedigreeInfo && (
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pedigree Info</label>
                        <p className="text-sm mt-1">{(qrCode.details as any).pedigreeInfo}</p>
                      </div>
                    )}
                    {(qrCode.details as any)?.vetName && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vet Name</label>
                        <p className="text-sm mt-1">{(qrCode.details as any).vetName}</p>
                      </div>
                    )}
                    {(qrCode.details as any)?.vetPhone && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vet Phone</label>
                        <p className="text-sm mt-1">{(qrCode.details as any).vetCountryCode || ''}{(qrCode.details as any).vetPhone}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Emergency Specific Fields */}
                {qrCode.type === 'emergency' && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Blood Type</label>
                        <p className="text-sm mt-1">{qrCode.details?.bloodType || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Medical Aid Provider</label>
                        <p className="text-sm mt-1">{qrCode.details?.medicalAidProvider || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Medical Aid Number</label>
                        <p className="text-sm mt-1 font-mono">{qrCode.details?.medicalAidNumber || 'N/A'}</p>
                      </div>
                      {qrCode.details?.organDonor !== undefined && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Organ Donor</label>
                          <p className="text-sm mt-1">
                            {qrCode.details.organDonor ? (
                              <span className="text-green-600 font-medium">Yes</span>
                            ) : (
                              <span className="text-gray-600">No</span>
                            )}
                          </p>
                      </div>
                    )}
                    </div>
                    {qrCode.details?.allergies && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Allergies</label>
                        <p className="text-sm mt-1">{qrCode.details.allergies}</p>
                      </div>
                    )}
                    {qrCode.details?.medications && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Medications</label>
                        <p className="text-sm mt-1">{qrCode.details.medications}</p>
                      </div>
                    )}
                    {qrCode.details?.iceNote && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">ICE Note</label>
                        <p className="text-sm mt-1">{qrCode.details.iceNote}</p>
                      </div>
                    )}
                    {(qrCode.details?.emergencyContact1Name || qrCode.details?.emergencyContact2Name) && (
                      <div className="pt-4 border-t">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 block">Emergency Contacts</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {qrCode.details?.emergencyContact1Name && (
                            <div className="p-3 bg-red-50 rounded-lg">
                              <div className="text-xs font-medium text-gray-700 mb-2">Emergency Contact 1</div>
                              <div className="text-sm">{qrCode.details.emergencyContact1Name}</div>
                              {qrCode.details?.emergencyContact1Phone && (
                                <div className="text-sm text-gray-600">
                                  {qrCode.details.emergencyContact1CountryCode || ''}{qrCode.details.emergencyContact1Phone}
                                </div>
                              )}
                              {(qrCode.details as any)?.emergencyContact1Relation && (
                                <div className="text-xs text-gray-500 mt-1">Relation: {(qrCode.details as any).emergencyContact1Relation}</div>
                              )}
                            </div>
                          )}
                          {qrCode.details?.emergencyContact2Name && (
                            <div className="p-3 bg-red-50 rounded-lg">
                              <div className="text-xs font-medium text-gray-700 mb-2">Emergency Contact 2</div>
                              <div className="text-sm">{qrCode.details.emergencyContact2Name}</div>
                              {qrCode.details?.emergencyContact2Phone && (
                                <div className="text-sm text-gray-600">
                                  {qrCode.details.emergencyContact2CountryCode || ''}{qrCode.details.emergencyContact2Phone}
                                </div>
                              )}
                              {(qrCode.details as any)?.emergencyContact2Relation && (
                                <div className="text-xs text-gray-500 mt-1">Relation: {(qrCode.details as any).emergencyContact2Relation}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Contact Name
                  </label>
                  <p className="text-sm mt-1 font-medium">{qrCode.contact?.name || 'N/A'}</p>
              </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </label>
                  <p className="text-sm mt-1">{qrCode.contact?.email || 'N/A'}</p>
              </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Primary Phone
                  </label>
                  <p className="text-sm mt-1">
                    {(qrCode.contact as any)?.countryCode || ''}{qrCode.contact?.phone || 'N/A'}
                  </p>
                </div>
                {(qrCode.contact as any)?.backupPhone && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Backup Phone</label>
                    <p className="text-sm mt-1">
                      {(qrCode.contact as any)?.backupCountryCode || ''}{(qrCode.contact as any).backupPhone}
                    </p>
                  </div>
                )}
                {qrCode.contact?.message && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Message</label>
                    <p className="text-sm mt-1 bg-gray-50 p-3 rounded">{qrCode.contact.message}</p>
                  </div>
                )}
                {(qrCode.contact as any)?.location && (
                  <div className="col-span-2 pt-4 border-t">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-3">
                      <MapPin className="h-3 w-3" />
                      Location Information
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {(qrCode.contact as any).location.address && (
                        <div>
                          <label className="text-xs text-gray-600">Address</label>
                          <p className="text-sm mt-1">{(qrCode.contact as any).location.address}</p>
                        </div>
                      )}
                      {(qrCode.contact as any).location.city && (
                        <div>
                          <label className="text-xs text-gray-600">City</label>
                          <p className="text-sm mt-1">{(qrCode.contact as any).location.city}</p>
                        </div>
                      )}
                      {(qrCode.contact as any).location.country && (
                        <div>
                          <label className="text-xs text-gray-600">Country</label>
                          <p className="text-sm mt-1">{(qrCode.contact as any).location.country}</p>
                        </div>
                      )}
                      {(qrCode.contact as any).location.coordinates && ((qrCode.contact as any).location.coordinates.lat || (qrCode.contact as any).location.coordinates.lng) && (
                        <div>
                          <label className="text-xs text-gray-600">Coordinates</label>
                          <p className="text-sm mt-1 font-mono">
                            {(qrCode.contact as any).location.coordinates.lat}, {(qrCode.contact as any).location.coordinates.lng}
                          </p>
                        </div>
                      )}
                    </div>
                </div>
              )}
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          {(qrCode as any).settings && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Instant Alerts</label>
                    <p className="text-sm mt-1">
                      {(qrCode as any).settings.instantAlerts ? (
                        <span className="text-green-600 font-medium">Enabled</span>
                      ) : (
                        <span className="text-gray-400">Disabled</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Location Sharing</label>
                    <p className="text-sm mt-1">
                      {(qrCode as any).settings.locationSharing ? (
                        <span className="text-green-600 font-medium">Enabled</span>
                      ) : (
                        <span className="text-gray-400">Disabled</span>
                      )}
                    </p>
                  </div>
                  {(qrCode as any).settings.showContactOnFinderPage !== undefined && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Show Contact</label>
                      <p className="text-sm mt-1">
                        {(qrCode as any).settings.showContactOnFinderPage ? (
                          <span className="text-green-600 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </p>
                    </div>
                  )}
                  {(qrCode as any).settings.useBackupNumber !== undefined && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Use Backup Number</label>
                      <p className="text-sm mt-1">
                        {(qrCode as any).settings.useBackupNumber ? (
                          <span className="text-green-600 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Found By Information */}
          {(qrCode as any).foundBy && ((qrCode as any).foundBy.finderName || (qrCode as any).foundBy.finderEmail) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Found By Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(qrCode as any).foundBy.finderName && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Finder Name</label>
                      <p className="text-sm mt-1">{(qrCode as any).foundBy.finderName}</p>
                    </div>
                  )}
                  {(qrCode as any).foundBy.finderEmail && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Finder Email</label>
                      <p className="text-sm mt-1">{(qrCode as any).foundBy.finderEmail}</p>
                    </div>
                  )}
                  {(qrCode as any).foundBy.finderPhone && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Finder Phone</label>
                      <p className="text-sm mt-1">{(qrCode as any).foundBy.finderPhone}</p>
                    </div>
                  )}
                  {(qrCode as any).foundBy.foundDate && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Found Date</label>
                      <p className="text-sm mt-1">{formatDate((qrCode as any).foundBy.foundDate)}</p>
                    </div>
                  )}
                  {(qrCode as any).foundBy.foundLocation && (
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Found Location</label>
                      <p className="text-sm mt-1">{(qrCode as any).foundBy.foundLocation}</p>
                    </div>
                  )}
                  {(qrCode as any).foundBy.notes && (
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</label>
                      <p className="text-sm mt-1 bg-gray-50 p-3 rounded">{(qrCode as any).foundBy.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics & Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Statistics & Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scan Count</label>
                    <p className="text-sm font-semibold text-blue-600">{qrCode.scanCount || 0}</p>
                  </div>
                </div>
                {qrCode.lastScanned && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <Clock className="h-4 w-4 text-green-600" />
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Scanned</label>
                      <p className="text-sm text-green-600">{formatDate(qrCode.lastScanned)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created At</label>
                    <p className="text-sm text-purple-600">{formatDate(qrCode.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Updated At</label>
                    <p className="text-sm text-orange-600">{formatDate(qrCode.updatedAt)}</p>
                  </div>
                </div>
              </div>
              {(qrCode as any).metadata?.scanHistory && (qrCode as any).metadata.scanHistory.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 block">Scan History</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(qrCode as any).metadata.scanHistory.slice(0, 10).map((scan: any, index: number) => (
                      <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">{scan.scannedAt ? formatDate(scan.scannedAt) : 'Unknown date'}</span>
                          {scan.location && <span className="text-gray-500">{scan.location}</span>}
                        </div>
                        {scan.ipAddress && <div className="text-gray-400 mt-1">IP: {scan.ipAddress}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}


