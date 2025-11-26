"use client"

import React, { useState, useEffect } from "react"
import { QRCode } from "@/lib/api"
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import adminApiClient from "@/lib/api"
import { 
  Save, 
  Trash2, 
  Loader2,
  X,
  Power,
  PawPrint,
  Tag,
  QrCode as QrCodeIcon,
  Camera,
  AlertCircle,
  Info
} from "lucide-react"
import { MedicalCross } from "@/components/MedicalCross"
import PhoneInput from "@/components/phone-input"
import { parsePhoneNumber, getCountryCallingCode } from "libphonenumber-js"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface QRCodeEditModalProps {
  qrCode: QRCode | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onQRCodeUpdated?: () => void
}

// Helper function to extract phone number and country code
const parsePhoneNumberFromStored = (
  phone: string | undefined
): { phone: string; countryCode: string } => {
  if (!phone) return { phone: "", countryCode: "ZA" };
  try {
    const parsed = parsePhoneNumber(phone, "ZA");
    if (parsed) {
      return {
        phone: parsed.nationalNumber,
        countryCode: (parsed.country || "ZA") as string,
      };
    }
  } catch (e) {
    // Fallback: try to extract manually
    const match = phone.match(/^\+(\d+)(.+)$/);
    if (match) {
      return { 
        phone: match[2], 
        countryCode: `+${match[1]}` || "+27" 
      };
    }
  }
  // Default fallback
  const withoutPlus = phone.replace(/^\+/, "");
  return {
    phone: withoutPlus.replace(/^\d{1,3}/, ""),
    countryCode: "+27",
  };
};

// Phone validation function
const validatePhoneNumber = (phone: string, countryCode: string) => {
  if (!phone.trim()) {
    return { isValid: true, error: "" }; // Optional fields
  }
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length < 7) {
    return { isValid: false, error: "Phone number too short" };
  }
  if (cleanPhone.length > 15) {
    return { isValid: false, error: "Phone number too long" };
  }
  return { isValid: true, error: "" };
};

export function QRCodeEditModal({ qrCode: qrCodeProp, open, onOpenChange, onQRCodeUpdated }: QRCodeEditModalProps) {
  const [editingQR, setEditingQR] = useState<QRCode | null>(qrCodeProp)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  const [editMessageClicked, setEditMessageClicked] = useState(false)
  
  // Phone errors
  const [phoneErrors, setPhoneErrors] = useState({ main: "", backup: "" })
  const [vetPhoneError, setVetPhoneError] = useState("")
  const [emergencyPhoneError, setEmergencyPhoneError] = useState("")
  const [emergencyContact1PhoneError, setEmergencyContact1PhoneError] = useState("")
  const [emergencyContact2PhoneError, setEmergencyContact2PhoneError] = useState("")
  const [ageError, setAgeError] = useState("")
  
  // Toggle states
  const [showEmergencyDetails, setShowEmergencyDetails] = useState(false)
  const [showPedigreeInfo, setShowPedigreeInfo] = useState(false)
  const [showEmergencyMedicalDetails, setShowEmergencyMedicalDetails] = useState(false)
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false)
  const [backupPhoneTooltipOpen, setBackupPhoneTooltipOpen] = useState(false)
  const [emergencyContact1TooltipOpen, setEmergencyContact1TooltipOpen] = useState(false)
  const [emergencyContact2TooltipOpen, setEmergencyContact2TooltipOpen] = useState(false)

  const [editForm, setEditForm] = useState({
    contact: {
      name: "",
      phone: "",
      countryCode: "+27",
      backupPhone: "",
      backupCountryCode: "+27",
      email: "",
      message: "",
    },
    details: {
      name: "",
      description: "",
      category: "",
      color: "",
      brand: "",
      model: "",
      image: "",
      emergencyDetails: "",
      pedigreeInfo: "",
      // Pet fields
      medicalNotes: "",
      vetName: "",
      vetPhone: "",
      vetCountryCode: "ZA",
      emergencyContact: "",
      emergencyCountryCode: "ZA",
      breed: "",
      age: "",
      registrationNumber: "",
      breederInfo: "",
      // Emergency fields
      medicalAidProvider: "",
      medicalAidNumber: "",
      bloodType: "",
      allergies: "",
      medications: "",
      organDonor: false,
      iceNote: "",
      emergencyContact1Name: "",
      emergencyContact1Phone: "",
      emergencyContact1CountryCode: "ZA",
      emergencyContact1Relation: "",
      emergencyContact2Name: "",
      emergencyContact2Phone: "",
      emergencyContact2CountryCode: "ZA",
      emergencyContact2Relation: "",
    },
    settings: {
      instantAlerts: true,
      locationSharing: true,
      showContactOnFinderPage: true,
      useBackupNumber: true,
    },
  })

  // Handle input changes for edit form
  const handleEditInputChange = (field: string, value: string | boolean) => {
    const parts = field.split(".");
    if (parts.length === 2) {
      const [section, key] = parts;
      if (section === "contact" || section === "details" || section === "settings") {
        setEditForm((prev) => ({
          ...prev,
          [section]: {
            ...prev[section as keyof typeof prev],
            [key]: value,
          },
        }));
      }
    }
    
    // Validate phone numbers
    if (field === "contact.phone" && typeof value === "string") {
      const validation = validatePhoneNumber(value, editForm.contact.countryCode);
      setPhoneErrors((prev) => ({ ...prev, main: validation.isValid ? "" : validation.error }));
    } else if (field === "contact.backupPhone" && typeof value === "string") {
      const validation = validatePhoneNumber(value, editForm.contact.backupCountryCode || editForm.contact.countryCode);
      setPhoneErrors((prev) => ({ ...prev, backup: validation.isValid ? "" : validation.error }));
    }
  }

  // Form validation
  const isEditFormValid = () => {
    const { contact, details } = editForm;
    const hasRequiredFields = 
      contact.name.trim() !== "" &&
      contact.email.trim() !== "" &&
      contact.phone.trim() !== "" &&
      details.name.trim() !== "";
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(contact.email);
    
    const mainPhoneValidation = validatePhoneNumber(contact.phone, contact.countryCode);
    const backupPhoneValidation = contact.backupPhone
      ? validatePhoneNumber(contact.backupPhone, contact.backupCountryCode || contact.countryCode)
      : { isValid: true };
    
    return hasRequiredFields && isEmailValid && mainPhoneValidation.isValid && backupPhoneValidation.isValid;
  }

  // Update form when qrCode prop changes
  useEffect(() => {
    if (qrCodeProp) {
      setEditingQR(qrCodeProp);
      
      // Parse phone numbers
      const mainPhone = parsePhoneNumberFromStored(qrCodeProp.contact?.phone);
      const backupPhone = parsePhoneNumberFromStored(qrCodeProp.contact?.backupPhone);
      const vetPhone = parsePhoneNumberFromStored((qrCodeProp.details as any)?.vetPhone);
      const emergencyContact = parsePhoneNumberFromStored((qrCodeProp.details as any)?.emergencyContact);
      const emergencyContact1 = parsePhoneNumberFromStored((qrCodeProp.details as any)?.emergencyContact1Phone);
      const emergencyContact2 = parsePhoneNumberFromStored((qrCodeProp.details as any)?.emergencyContact2Phone);

      setEditForm({
        contact: {
          name: qrCodeProp.contact?.name || "",
          phone: mainPhone.phone,
          countryCode: qrCodeProp.contact?.countryCode || mainPhone.countryCode || "+27",
          backupPhone: backupPhone.phone,
          backupCountryCode: qrCodeProp.contact?.backupCountryCode || backupPhone.countryCode || "+27",
          email: qrCodeProp.contact?.email || "",
          message: qrCodeProp.contact?.message || "",
        },
        details: {
          name: qrCodeProp.details?.name || "",
          description: qrCodeProp.details?.description || "",
          category: qrCodeProp.details?.category || "",
          color: qrCodeProp.details?.color || "",
          brand: qrCodeProp.details?.brand || "",
          model: qrCodeProp.details?.model || "",
          image: qrCodeProp.details?.image || "",
          emergencyDetails: qrCodeProp.details?.emergencyDetails || "",
          pedigreeInfo: qrCodeProp.details?.pedigreeInfo || "",
          // Pet fields
          medicalNotes: (qrCodeProp.details as any)?.medicalNotes || "",
          vetName: (qrCodeProp.details as any)?.vetName || "",
          vetPhone: vetPhone.phone,
          vetCountryCode: (qrCodeProp.details as any)?.vetCountryCode || vetPhone.countryCode || "ZA",
          emergencyContact: emergencyContact.phone,
          emergencyCountryCode: (qrCodeProp.details as any)?.emergencyCountryCode || emergencyContact.countryCode || "ZA",
          breed: (qrCodeProp.details as any)?.breed || "",
          age: (qrCodeProp.details as any)?.age || "",
          registrationNumber: (qrCodeProp.details as any)?.registrationNumber || "",
          breederInfo: (qrCodeProp.details as any)?.breederInfo || "",
          // Emergency fields
          medicalAidProvider: (qrCodeProp.details as any)?.medicalAidProvider || "",
          medicalAidNumber: (qrCodeProp.details as any)?.medicalAidNumber || "",
          bloodType: (qrCodeProp.details as any)?.bloodType || "",
          allergies: (qrCodeProp.details as any)?.allergies || "",
          medications: (qrCodeProp.details as any)?.medications || "",
          organDonor: (qrCodeProp.details as any)?.organDonor || false,
          iceNote: (qrCodeProp.details as any)?.iceNote || "",
          emergencyContact1Name: (qrCodeProp.details as any)?.emergencyContact1Name || "",
          emergencyContact1Phone: emergencyContact1.phone,
          emergencyContact1CountryCode: (qrCodeProp.details as any)?.emergencyContact1CountryCode || emergencyContact1.countryCode || "ZA",
          emergencyContact1Relation: (qrCodeProp.details as any)?.emergencyContact1Relation || "",
          emergencyContact2Name: (qrCodeProp.details as any)?.emergencyContact2Name || "",
          emergencyContact2Phone: emergencyContact2.phone,
          emergencyContact2CountryCode: (qrCodeProp.details as any)?.emergencyContact2CountryCode || emergencyContact2.countryCode || "ZA",
          emergencyContact2Relation: (qrCodeProp.details as any)?.emergencyContact2Relation || "",
        },
        settings: {
          instantAlerts: qrCodeProp.settings?.instantAlerts ?? true,
          locationSharing: qrCodeProp.settings?.locationSharing ?? true,
          showContactOnFinderPage: qrCodeProp.settings?.showContactOnFinderPage ?? true,
          useBackupNumber: (qrCodeProp.settings as any)?.useBackupNumber ?? true,
        },
      });

      // Set toggle states
      setShowEmergencyDetails(!!(
        (qrCodeProp.details as any)?.emergencyDetails ||
        (qrCodeProp.details as any)?.medicalNotes ||
        (qrCodeProp.details as any)?.vetName ||
        (qrCodeProp.details as any)?.emergencyContact
      ));
      setShowPedigreeInfo(!!(
        qrCodeProp.details?.pedigreeInfo ||
        (qrCodeProp.details as any)?.breed ||
        (qrCodeProp.details as any)?.age ||
        (qrCodeProp.details as any)?.registrationNumber ||
        (qrCodeProp.details as any)?.breederInfo
      ));
      setShowEmergencyMedicalDetails(!!(
        (qrCodeProp.details as any)?.medicalAidProvider ||
        (qrCodeProp.details as any)?.medicalAidNumber ||
        (qrCodeProp.details as any)?.bloodType ||
        (qrCodeProp.details as any)?.allergies ||
        (qrCodeProp.details as any)?.medications ||
        (qrCodeProp.details as any)?.organDonor
      ));
      setShowEmergencyContacts(!!(
        (qrCodeProp.details as any)?.emergencyContact1Name ||
        (qrCodeProp.details as any)?.emergencyContact2Name
      ));
      setEditMessageClicked(!!qrCodeProp.contact?.message);
      setEditImagePreview(qrCodeProp.details?.image || null);
      setError("")
      setSuccess("")
    }
  }, [qrCodeProp])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        handleEditInputChange("details.image", result);
        setEditImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQR) return;

    // Final validation
    const mainPhoneValidation = validatePhoneNumber(editForm.contact.phone, editForm.contact.countryCode);
    const backupPhoneValidation = editForm.contact.backupPhone
      ? validatePhoneNumber(editForm.contact.backupPhone, editForm.contact.backupCountryCode || editForm.contact.countryCode)
      : { isValid: true, error: "" };

    if (!mainPhoneValidation.isValid || !backupPhoneValidation.isValid) {
      setPhoneErrors({
        main: mainPhoneValidation.error,
        backup: backupPhoneValidation.error,
      });
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Prepare update data
      const updateData: any = {
        contact: {
          name: editForm.contact.name,
          message: editForm.contact.message,
          ...(editForm.contact.backupPhone
            ? {
                backupPhone: `+${getCountryCallingCode(editForm.contact.backupCountryCode as any)}${editForm.contact.backupPhone}`,
                backupCountryCode: editForm.contact.backupCountryCode,
              }
            : {}),
        },
        details: {
          ...editForm.details,
          vetCountryCode: editForm.details.vetCountryCode,
          emergencyCountryCode: editForm.details.emergencyCountryCode,
          emergencyContact1CountryCode: editForm.details.emergencyContact1CountryCode,
          emergencyContact2CountryCode: editForm.details.emergencyContact2CountryCode,
          // Format phone numbers with country codes
          vetPhone: showEmergencyDetails && editForm.details.vetPhone
            ? `+${getCountryCallingCode(editForm.details.vetCountryCode as any)}${editForm.details.vetPhone}`
            : undefined,
          emergencyContact: showEmergencyDetails && editForm.details.emergencyContact
            ? `+${getCountryCallingCode(editForm.details.emergencyCountryCode as any)}${editForm.details.emergencyContact}`
            : undefined,
          medicalNotes: showEmergencyDetails ? editForm.details.medicalNotes : "",
          vetName: showEmergencyDetails ? editForm.details.vetName : "",
          emergencyDetails: showEmergencyDetails ? editForm.details.emergencyDetails : "",
          breed: showPedigreeInfo ? editForm.details.breed : "",
          age: showPedigreeInfo ? editForm.details.age : "",
          registrationNumber: showPedigreeInfo ? editForm.details.registrationNumber : "",
          breederInfo: showPedigreeInfo ? editForm.details.breederInfo : "",
          pedigreeInfo: showPedigreeInfo ? editForm.details.pedigreeInfo : "",
          medicalAidProvider: showEmergencyMedicalDetails ? editForm.details.medicalAidProvider : "",
          medicalAidNumber: showEmergencyMedicalDetails ? editForm.details.medicalAidNumber : "",
          bloodType: showEmergencyMedicalDetails ? editForm.details.bloodType : "",
          allergies: showEmergencyMedicalDetails ? editForm.details.allergies : "",
          medications: showEmergencyMedicalDetails ? editForm.details.medications : "",
          organDonor: showEmergencyMedicalDetails ? editForm.details.organDonor : false,
          iceNote: editForm.details.iceNote || "",
          emergencyContact1Name: showEmergencyContacts ? editForm.details.emergencyContact1Name : "",
          emergencyContact1Phone: showEmergencyContacts && editForm.details.emergencyContact1Phone
            ? `+${getCountryCallingCode(editForm.details.emergencyContact1CountryCode as any)}${editForm.details.emergencyContact1Phone}`
            : undefined,
          emergencyContact1Relation: showEmergencyContacts ? editForm.details.emergencyContact1Relation : "",
          emergencyContact2Name: showEmergencyContacts ? editForm.details.emergencyContact2Name : "",
          emergencyContact2Phone: showEmergencyContacts && editForm.details.emergencyContact2Phone
            ? `+${getCountryCallingCode(editForm.details.emergencyContact2CountryCode as any)}${editForm.details.emergencyContact2Phone}`
            : undefined,
          emergencyContact2Relation: showEmergencyContacts ? editForm.details.emergencyContact2Relation : "",
        },
        settings: {
          instantAlerts: editForm.settings.instantAlerts,
          locationSharing: editForm.settings.locationSharing,
          showContactOnFinderPage: editForm.settings.showContactOnFinderPage,
          useBackupNumber: editForm.settings.useBackupNumber,
        },
      };

      const response = await adminApiClient.updateQRCode(editingQR.code, updateData);
      
      if (response.success) {
        setSuccess("QR code updated successfully!");
        if (onQRCodeUpdated) {
          setTimeout(() => {
            onQRCodeUpdated();
            onOpenChange(false);
          }, 1000);
        }
      } else {
        setError(response.message || "Failed to update QR code");
      }
    } catch (err: any) {
      console.error('Error updating QR code:', err);
      setError(err.message || "Failed to update QR code");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!editingQR) return;
    try {
      setSaving(true);
      const newStatus = editingQR.isActivated ? "inactive" : "active";
      const response = await adminApiClient.updateQRCodeStatus(editingQR.code, newStatus);
      if (response.success) {
        setEditingQR(prev => prev ? { ...prev, isActivated: newStatus === "active" } : null);
        setSuccess(`QR code ${newStatus === "active" ? "activated" : "deactivated"} successfully!`);
        if (onQRCodeUpdated) {
          setTimeout(() => {
            onQRCodeUpdated();
          }, 1000);
        }
      } else {
        setError(response.message || "Failed to update QR code status");
      }
    } catch (err: any) {
      console.error('Error toggling QR code status:', err);
      setError(err.message || "Failed to update QR code status");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingQR) return;
    try {
      setSaving(true);
      const response = await adminApiClient.deleteQRCode(editingQR.code);
      if (response.success) {
        setSuccess("QR code deleted successfully!");
        setShowDeleteDialog(false);
        if (onQRCodeUpdated) {
          setTimeout(() => {
            onQRCodeUpdated();
            onOpenChange(false);
          }, 1000);
        }
      } else {
        setError(response.message || "Failed to delete QR code");
      }
    } catch (err: any) {
      console.error('Error deleting QR code:', err);
      setError(err.message || "Failed to delete QR code");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    onOpenChange(false);
  };

  if (!editingQR) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-black rounded-lg">
                  <QrCodeIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle>
                    Edit{" "}
                    {editingQR.type === "pet"
                      ? "Pet"
                      : editingQR.type === "emergency"
                      ? "Emergency"
                      : "Item"}{" "}
                    Details
                  </DialogTitle>
                  <DialogDescription>
                    Update all information for this QR code
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={editingQR.isActivated ? "default" : "secondary"}>
                  {editingQR.isActivated ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4">
            <form onSubmit={handleEditSubmit} className="space-y-4 sm:space-y-6">
              {/* Contact Information */}
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 border-b pb-2">
                  Contact Information
                </h4>

                <div>
                  <Label htmlFor="editContactName" className="text-sm">
                    Full Name *
                  </Label>
                  <Input
                    id="editContactName"
                    value={editForm.contact.name}
                    onChange={(e) => handleEditInputChange("contact.name", e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className="mt-1 text-sm"
                  />
                </div>

                <div>
                  <PhoneInput
                    value={editForm.contact.phone}
                    onChange={(value) => handleEditInputChange("contact.phone", value)}
                    onCountryChange={(countryCode) => handleEditInputChange("contact.countryCode", countryCode)}
                    onErrorChange={(error) => setPhoneErrors((prev) => ({ ...prev, main: error }))}
                    countryCode={editForm.contact.countryCode}
                    label="Whatsapp Phone Number"
                    required
                    error={phoneErrors.main}
                    id="editPhone"
                    disabled={true}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Phone number cannot be changed
                  </p>
                </div>

                {/* Backup Phone Number */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor="editBackupPhone" className="text-sm">
                      Backup Phone Number (Optional)
                    </Label>
                    <Tooltip open={backupPhoneTooltipOpen} onOpenChange={setBackupPhoneTooltipOpen}>
                      <TooltipTrigger asChild>
                        <Info
                          className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help"
                          onClick={(e) => {
                            e.preventDefault();
                            setBackupPhoneTooltipOpen(!backupPhoneTooltipOpen);
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Make sure the person listed has agreed to be contacted in case your item is found.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <PhoneInput
                    value={editForm.contact.backupPhone}
                    onChange={(value) => handleEditInputChange("contact.backupPhone", value)}
                    onCountryChange={(countryCode) => handleEditInputChange("contact.backupCountryCode", countryCode)}
                    onErrorChange={(error) => setPhoneErrors((prev) => ({ ...prev, backup: error }))}
                    countryCode={editForm.contact.backupCountryCode}
                    placeholder="Enter backup phone number"
                    error={phoneErrors.backup}
                    id="editBackupPhone"
                  />

                  {/* Backup Number Consent Toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mt-3">
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-black">
                        Use backup number if I can't be reached
                      </Label>
                      <p className="text-xs text-gray-600 mt-1">
                        {editForm.contact.backupPhone.trim()
                          ? "If unchecked, backup number won't appear on the public scan page"
                          : "Enter a backup phone number above to enable this option"}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <button
                        type="button"
                        onClick={() => handleEditInputChange("settings.useBackupNumber", !editForm.settings.useBackupNumber)}
                        disabled={!editForm.contact.backupPhone.trim()}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          editForm.contact.backupPhone.trim()
                            ? editForm.settings.useBackupNumber
                              ? "bg-blue-600"
                              : "bg-gray-300"
                            : "bg-gray-200 cursor-not-allowed"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            editForm.settings.useBackupNumber && editForm.contact.backupPhone.trim()
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="editEmail" className="text-sm">
                    Email *
                  </Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editForm.contact.email}
                    onChange={(e) => handleEditInputChange("contact.email", e.target.value)}
                    placeholder="your.email@example.com"
                    required
                    className="mt-1 text-sm"
                    disabled={true}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>
              </div>

              {/* Item/Pet/Emergency Name */}
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="editName" className="text-sm">
                    {editingQR.type === "pet"
                      ? "Pet Name"
                      : editingQR.type === "emergency"
                      ? "Tag Wearer Name"
                      : "Item Name"}{" "}
                    *
                  </Label>
                  <Input
                    id="editName"
                    value={editForm.details.name}
                    onChange={(e) => handleEditInputChange("details.name", e.target.value)}
                    placeholder={
                      editingQR.type === "emergency"
                        ? "Who will wear or use this tag"
                        : `Enter your ${editingQR.type === "pet" ? "pet" : "item"} name`
                    }
                    required
                    className="mt-1 text-sm"
                  />
                  {editingQR.type === "emergency" && (
                    <p className="text-xs text-gray-600 mt-1">
                      If you are activating this for yourself, just enter your own name.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="editMessage">
                    Finder Message (Auto generated) (Editable)
                  </Label>
                  <Textarea
                    id="editMessage"
                    value={editMessageClicked ? editForm.contact.message : ""}
                    onChange={(e) => handleEditInputChange("contact.message", e.target.value)}
                    onFocus={() => {
                      if (!editMessageClicked) {
                        setEditMessageClicked(true);
                        const defaultMessage =
                          editingQR.type === "emergency"
                            ? "Hi! This is an emergency tag. If you've scanned this, I may need help. Please contact my emergency contacts listed below or seek medical attention if required. Thank you for your support."
                            : editingQR.type === "pet"
                            ? editForm.details.name
                              ? `Hi! Thanks for finding my pet ${editForm.details.name}. Please contact me so we can arrange a return. I really appreciate your honesty and help!`
                              : "Hi! Thanks for finding my pet. Please contact me so we can arrange a return. I really appreciate your honesty and help!"
                            : editForm.details.name
                            ? `Hi! Thanks for finding my item ${editForm.details.name}. Please contact me so we can arrange a return. I really appreciate your honesty and help!`
                            : "Hi! Thanks for finding my item. Please contact me so we can arrange a return. I really appreciate your honesty and help!";
                        handleEditInputChange("contact.message", defaultMessage);
                      }
                    }}
                    placeholder={
                      editingQR.type === "emergency"
                        ? "Hi! This is an emergency tag. If you've scanned this, I may need help. Please contact my emergency contacts listed below or seek medical attention if required. Thank you for your support."
                        : editingQR.type === "pet"
                        ? editForm.details.name
                          ? `Hi! Thanks for finding my pet ${editForm.details.name}. Please contact me so we can arrange a return. I really appreciate your honesty and help!`
                          : "Hi! Thanks for finding my pet. Please contact me so we can arrange a return. I really appreciate your honesty and help!"
                        : editForm.details.name
                        ? `Hi! Thanks for finding my item ${editForm.details.name}. Please contact me so we can arrange a return. I really appreciate your honesty and help!`
                        : "Hi! Thanks for finding my item. Please contact me so we can arrange a return. I really appreciate your honesty and help!"
                    }
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Item Image Upload */}
              {editingQR.type === "item" && (
                <div className="space-y-4">
                  <div>
                    <Label>Item Photo (Optional)</Label>
                    <div className="mt-2">
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                        onClick={() => document.getElementById("edit-item-image-upload")?.click()}
                      >
                        <input
                          id="edit-item-image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        {editImagePreview || editForm.details.image ? (
                          <div className="space-y-3">
                            <img
                              src={editImagePreview || editForm.details.image}
                              alt="Item"
                              className="w-24 h-24 object-cover rounded-lg mx-auto"
                            />
                            <p className="text-sm text-gray-600">Click to change photo</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                              <Camera className="h-8 w-8 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Upload Image</p>
                              <p className="text-xs text-gray-500">Tap to select from camera or gallery</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pet Image Upload */}
              {editingQR.type === "pet" && (
                <div className="space-y-4">
                  <div>
                    <Label>Pet Photo (Optional)</Label>
                    <div className="mt-2">
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                        onClick={() => document.getElementById("edit-pet-image-upload")?.click()}
                      >
                        <input
                          id="edit-pet-image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        {editImagePreview || editForm.details.image ? (
                          <div className="space-y-3">
                            <img
                              src={editImagePreview || editForm.details.image}
                              alt="Pet"
                              className="w-24 h-24 object-cover rounded-lg mx-auto"
                            />
                            <p className="text-sm text-gray-600">Click to change photo</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                              <Camera className="h-8 w-8 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Upload Image</p>
                              <p className="text-xs text-gray-500">Tap to select from camera or gallery</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pet-specific fields */}
              {editingQR.type === "pet" && (
                <div className="space-y-4">
                  {/* Emergency Details Toggle */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm font-medium text-black">
                          Emergency Details
                        </Label>
                        <p className="text-xs text-gray-600 mt-1">
                          Add medical info, special needs, or emergency contacts
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEmergencyDetails(!showEmergencyDetails)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          showEmergencyDetails ? "bg-blue-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showEmergencyDetails ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {showEmergencyDetails && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="editMedicalNotes">
                            Medical Notes (Optional)
                          </Label>
                          <Textarea
                            id="editMedicalNotes"
                            value={editForm.details.medicalNotes || ""}
                            onChange={(e) => handleEditInputChange("details.medicalNotes", e.target.value)}
                            placeholder="Any medical conditions, medications, or special care instructions"
                            rows={3}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="editVetName">
                            Veterinarian Name (Optional)
                          </Label>
                          <Input
                            id="editVetName"
                            value={editForm.details.vetName || ""}
                            onChange={(e) => handleEditInputChange("details.vetName", e.target.value)}
                            placeholder="e.g., Dr. Smith - Happy Paws Clinic"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="editVetPhone">
                            Vet Phone Number (Optional)
                          </Label>
                          <PhoneInput
                            value={editForm.details.vetPhone || ""}
                            countryCode={editForm.details.vetCountryCode || "ZA"}
                            onChange={(value) => handleEditInputChange("details.vetPhone", value)}
                            onCountryChange={(countryCode) => handleEditInputChange("details.vetCountryCode", countryCode)}
                            onErrorChange={(error) => setVetPhoneError(error)}
                            error={vetPhoneError}
                            id="editVetPhone"
                          />
                        </div>

                        <div>
                          <Label htmlFor="editEmergencyContact">
                            Emergency Contact (Optional)
                          </Label>
                          <PhoneInput
                            value={editForm.details.emergencyContact || ""}
                            countryCode={editForm.details.emergencyCountryCode || "ZA"}
                            onChange={(value) => handleEditInputChange("details.emergencyContact", value)}
                            onCountryChange={(countryCode) => handleEditInputChange("details.emergencyCountryCode", countryCode)}
                            onErrorChange={(error) => setEmergencyPhoneError(error)}
                            error={emergencyPhoneError}
                            id="editEmergencyContact"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pedigree Info Toggle */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm font-medium text-black">
                          Pedigree Information
                        </Label>
                        <p className="text-xs text-gray-600 mt-1">
                          Add breeding info, registration details, or lineage
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPedigreeInfo(!showPedigreeInfo)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          showPedigreeInfo ? "bg-blue-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showPedigreeInfo ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {showPedigreeInfo && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="editBreed">Breed</Label>
                          <Input
                            id="editBreed"
                            value={editForm.details.breed || ""}
                            onChange={(e) => handleEditInputChange("details.breed", e.target.value)}
                            placeholder="e.g., Golden Retriever"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="editColor">Color</Label>
                          <Input
                            id="editColor"
                            value={editForm.details.color || ""}
                            onChange={(e) => handleEditInputChange("details.color", e.target.value)}
                            placeholder="e.g., Golden/Cream"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="editAge">Age</Label>
                          <Input
                            id="editAge"
                            value={editForm.details.age || ""}
                            onChange={(e) => {
                              const age = e.target.value;
                              if (age === "" || (!isNaN(Number(age)) && Number(age) >= 0 && Number(age) <= 50)) {
                                handleEditInputChange("details.age", age);
                                if (age && (isNaN(Number(age)) || Number(age) < 0 || Number(age) > 50)) {
                                  setAgeError("Age must be between 0 and 50");
                                } else {
                                  setAgeError("");
                                }
                              }
                            }}
                            placeholder="e.g., 3"
                            className={`mt-1 ${ageError ? "border-red-500" : ""}`}
                            type="number"
                            min="0"
                            max="50"
                          />
                          {ageError && (
                            <p className="text-red-500 text-sm mt-1">{ageError}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="editRegistrationNumber">
                            Registration Number (Optional)
                          </Label>
                          <Input
                            id="editRegistrationNumber"
                            value={editForm.details.registrationNumber || ""}
                            onChange={(e) => handleEditInputChange("details.registrationNumber", e.target.value)}
                            placeholder="e.g., AKC #123456789"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="editBreederInfo">
                            Breeder Information (Optional)
                          </Label>
                          <Input
                            id="editBreederInfo"
                            value={editForm.details.breederInfo || ""}
                            onChange={(e) => handleEditInputChange("details.breederInfo", e.target.value)}
                            placeholder="e.g., Champion bloodline, breeder contact"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Emergency Photo Upload */}
              {editingQR.type === "emergency" && (
                <div className="space-y-4">
                  <div>
                    <Label>Emergency Contact Photo (Optional)</Label>
                    <div className="mt-2">
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors"
                        onClick={() => document.getElementById("edit-emergency-image-upload")?.click()}
                      >
                        <input
                          id="edit-emergency-image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        {editImagePreview || editForm.details.image ? (
                          <div className="space-y-3">
                            <img
                              src={editImagePreview || editForm.details.image}
                              alt="Emergency Contact"
                              className="w-24 h-24 object-cover rounded-lg mx-auto"
                            />
                            <p className="text-sm text-gray-600">Click to change photo</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto">
                              <Camera className="h-8 w-8 text-red-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Upload Emergency Contact Photo</p>
                              <p className="text-xs text-gray-500">Tap to select from camera or gallery</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Emergency-specific fields */}
              {editingQR.type === "emergency" && (
                <div className="space-y-4">
                  {/* Emergency Medical Details Toggle */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm font-medium text-black flex items-center gap-2">
                          <MedicalCross className="h-4 w-4 text-red-600" size={16} />
                          Add Emergency Details
                        </Label>
                        <p className="text-xs text-gray-600 mt-1">
                          Medical aid info, blood type, allergies, medications
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEmergencyMedicalDetails(!showEmergencyMedicalDetails)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                          showEmergencyMedicalDetails ? "bg-red-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showEmergencyMedicalDetails ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {showEmergencyMedicalDetails && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="editMedicalAidProvider">
                              Medical Aid Provider
                            </Label>
                            <Input
                              id="editMedicalAidProvider"
                              value={editForm.details.medicalAidProvider || ""}
                              onChange={(e) => handleEditInputChange("details.medicalAidProvider", e.target.value)}
                              placeholder="e.g., Discovery Health"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="editMedicalAidNumber">
                              Medical Aid Number
                            </Label>
                            <Input
                              id="editMedicalAidNumber"
                              value={editForm.details.medicalAidNumber || ""}
                              onChange={(e) => handleEditInputChange("details.medicalAidNumber", e.target.value)}
                              placeholder="e.g., 123 456 7890"
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="editBloodType">Blood Type</Label>
                          <Select
                            value={editForm.details.bloodType || ""}
                            onValueChange={(value) => handleEditInputChange("details.bloodType", value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select blood type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A+">A+</SelectItem>
                              <SelectItem value="A-">A-</SelectItem>
                              <SelectItem value="B+">B+</SelectItem>
                              <SelectItem value="B-">B-</SelectItem>
                              <SelectItem value="AB+">AB+</SelectItem>
                              <SelectItem value="AB-">AB-</SelectItem>
                              <SelectItem value="O+">O+</SelectItem>
                              <SelectItem value="O-">O-</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="editAllergies">
                            Allergies / Medical Conditions
                          </Label>
                          <Textarea
                            id="editAllergies"
                            value={editForm.details.allergies || ""}
                            onChange={(e) => handleEditInputChange("details.allergies", e.target.value)}
                            placeholder="e.g., Penicillin Allergy, Asthma, Epilepsy"
                            rows={3}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="editMedications">Medications</Label>
                          <Textarea
                            id="editMedications"
                            value={editForm.details.medications || ""}
                            onChange={(e) => handleEditInputChange("details.medications", e.target.value)}
                            placeholder="e.g., Ventolin, Epipen, Insulin"
                            rows={3}
                            className="mt-1"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <Label className="text-sm font-medium text-black">
                              Organ Donor
                            </Label>
                            <p className="text-xs text-gray-600 mt-1">
                              Are you registered as an organ donor?
                            </p>
                          </div>
                          <div className="flex-shrink-0 ml-4">
                            <button
                              type="button"
                              onClick={() => handleEditInputChange("details.organDonor", !editForm.details.organDonor)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                                editForm.details.organDonor ? "bg-red-600" : "bg-gray-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  editForm.details.organDonor ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="editIceNote">
                            ICE Note / Special Instruction
                          </Label>
                          <Textarea
                            id="editIceNote"
                            value={editForm.details.iceNote || ""}
                            onChange={(e) => handleEditInputChange("details.iceNote", e.target.value)}
                            placeholder="e.g., Please notify both emergency contacts immediately."
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Emergency Contacts Toggle */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm font-medium text-black flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          Emergency Contacts
                        </Label>
                        <p className="text-xs text-gray-600 mt-1">
                          Primary and secondary emergency contacts
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEmergencyContacts(!showEmergencyContacts)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                          showEmergencyContacts ? "bg-red-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showEmergencyContacts ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {showEmergencyContacts && (
                      <div className="space-y-4">
                        {/* Emergency Contact 1 */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-black">
                              Emergency Contact 1
                            </Label>
                            <Tooltip open={emergencyContact1TooltipOpen} onOpenChange={setEmergencyContact1TooltipOpen}>
                              <TooltipTrigger asChild>
                                <Info
                                  className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setEmergencyContact1TooltipOpen(!emergencyContact1TooltipOpen);
                                  }}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Make sure they have agreed to be contacted in case of emergency.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          <div>
                            <Label htmlFor="editEmergencyContact1Name">Contact Name</Label>
                            <Input
                              id="editEmergencyContact1Name"
                              value={editForm.details.emergencyContact1Name || ""}
                              onChange={(e) => handleEditInputChange("details.emergencyContact1Name", e.target.value)}
                              placeholder="e.g., John Smith"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="editEmergencyContact1Phone">Contact Number</Label>
                            <PhoneInput
                              value={editForm.details.emergencyContact1Phone || ""}
                              countryCode={editForm.details.emergencyContact1CountryCode || "ZA"}
                              onChange={(value) => handleEditInputChange("details.emergencyContact1Phone", value)}
                              onCountryChange={(countryCode) => handleEditInputChange("details.emergencyContact1CountryCode", countryCode)}
                              onErrorChange={(error) => setEmergencyContact1PhoneError(error)}
                              error={emergencyContact1PhoneError}
                              id="editEmergencyContact1Phone"
                              placeholder="e.g., 083 456 7890"
                            />
                          </div>

                          <div>
                            <Label htmlFor="editEmergencyContact1Relation">Relation</Label>
                            <Input
                              id="editEmergencyContact1Relation"
                              value={editForm.details.emergencyContact1Relation || ""}
                              onChange={(e) => handleEditInputChange("details.emergencyContact1Relation", e.target.value)}
                              placeholder="e.g., Brother / Spouse / Doctor"
                              className="mt-1"
                            />
                          </div>
                        </div>

                        {/* Emergency Contact 2 */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-black">
                              Emergency Contact 2
                            </Label>
                            <Tooltip open={emergencyContact2TooltipOpen} onOpenChange={setEmergencyContact2TooltipOpen}>
                              <TooltipTrigger asChild>
                                <Info
                                  className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setEmergencyContact2TooltipOpen(!emergencyContact2TooltipOpen);
                                  }}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Make sure they have agreed to be contacted in case of emergency.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          <div>
                            <Label htmlFor="editEmergencyContact2Name">Contact Name</Label>
                            <Input
                              id="editEmergencyContact2Name"
                              value={editForm.details.emergencyContact2Name || ""}
                              onChange={(e) => handleEditInputChange("details.emergencyContact2Name", e.target.value)}
                              placeholder="e.g., Jane Doe"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="editEmergencyContact2Phone">Contact Number</Label>
                            <PhoneInput
                              value={editForm.details.emergencyContact2Phone || ""}
                              countryCode={editForm.details.emergencyContact2CountryCode || "ZA"}
                              onChange={(value) => handleEditInputChange("details.emergencyContact2Phone", value)}
                              onCountryChange={(countryCode) => handleEditInputChange("details.emergencyContact2CountryCode", countryCode)}
                              onErrorChange={(error) => setEmergencyContact2PhoneError(error)}
                              error={emergencyContact2PhoneError}
                              id="editEmergencyContact2Phone"
                              placeholder="e.g., 083 456 7890"
                            />
                          </div>

                          <div>
                            <Label htmlFor="editEmergencyContact2Relation">Relation</Label>
                            <Input
                              id="editEmergencyContact2Relation"
                              value={editForm.details.emergencyContact2Relation || ""}
                              onChange={(e) => handleEditInputChange("details.emergencyContact2Relation", e.target.value)}
                              placeholder="e.g., Brother / Spouse / Doctor"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Toggle Settings */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-3">
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium text-black">
                      Instant Alerts
                    </Label>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Get notified on Email when someone finds your item
                    </p>
                  </div>
                  <div className="flex-shrink-0 sm:ml-4">
                    <button
                      type="button"
                      onClick={() => handleEditInputChange("settings.instantAlerts", !editForm.settings.instantAlerts)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        editForm.settings.instantAlerts ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editForm.settings.instantAlerts ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-3">
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium text-black">
                      Show Contact Information
                    </Label>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Display your contact details on the finder page
                    </p>
                  </div>
                  <div className="flex-shrink-0 sm:ml-4">
                    <button
                      type="button"
                      onClick={() => handleEditInputChange("settings.showContactOnFinderPage", !editForm.settings.showContactOnFinderPage)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        editForm.settings.showContactOnFinderPage ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editForm.settings.showContactOnFinderPage ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                  <p className="text-green-800 text-sm">{success}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleToggleStatus}
                    variant={editingQR.isActivated ? "destructive" : "default"}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Power className="h-4 w-4 mr-2" />
                    )}
                    {editingQR.isActivated ? "Deactivate" : "Activate"}
                  </Button>

                  <Button
                    type="button"
                    variant="destructive"
                    disabled={saving}
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isEditFormValid() || saving}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-800 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your QR code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
