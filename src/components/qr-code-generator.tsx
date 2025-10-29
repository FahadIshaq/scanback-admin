"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Copy, Check, FileImage, FileText, File, Palette, Stethoscope } from "lucide-react"
import adminApiClient from "@/lib/api"
import { QRStickerEditor } from "./qr-sticker-editor"

export function QRCodeGenerator() {
  const [formData, setFormData] = useState({
    type: "item" as "item" | "pet" | "emergency" | "any"
  })

  const [generatedQR, setGeneratedQR] = useState<{
    code: string
    qrImageUrl: string
    qrUrl: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exportFormat, setExportFormat] = useState<"png" | "svg" | "pdf" | "txt">("png")
  const [showStickerEditor, setShowStickerEditor] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

      try {
        // Admin generates blank QR codes - users fill all details when scanning
        const qrData = {
          type: formData.type,
          details: {},
          contact: {}
        }

      const response = await adminApiClient.generateQRCode(qrData) as any
      
      if (response.success) {
        setGeneratedQR({
          code: response.data.qrCode.code,
          qrImageUrl: response.data.qrImageDataURL,
          qrUrl: response.data.qrUrl
        })
      }
    } catch (error: unknown) {
      console.error("Failed to generate QR code:", error)
      alert((error as Error).message || "Failed to generate QR code")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const downloadQR = () => {
    if (generatedQR) {
      const link = document.createElement('a')
      link.href = generatedQR.qrImageUrl
      link.download = `qr-code-${generatedQR.code}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const downloadAsSVG = () => {
    if (!generatedQR) return

    const svgContent = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="white" stroke="#000" stroke-width="2"/>
        <text x="100" y="100" text-anchor="middle" font-family="monospace" font-size="12" fill="#000">
          QR Code: ${generatedQR.code}
        </text>
        <text x="100" y="120" text-anchor="middle" font-family="monospace" font-size="10" fill="#666">
          Type: ${formData.type.toUpperCase()}
        </text>
        <text x="100" y="140" text-anchor="middle" font-family="monospace" font-size="8" fill="#999">
          Scan to activate
        </text>
      </svg>
    `

    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `qr-code-${generatedQR.code}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const downloadAsPDF = () => {
    if (!generatedQR) return

    const pdfContent = `
      %PDF-1.4
      1 0 obj
      <<
        /Type /Catalog
        /Pages 2 0 R
      >>
      endobj
      
      2 0 obj
      <<
        /Type /Pages
        /Kids [3 0 R]
        /Count 1
      >>
      endobj
      
      3 0 obj
      <<
        /Type /Page
        /Parent 2 0 R
        /MediaBox [0 0 612 792]
        /Contents 4 0 R
      >>
      endobj
      
      4 0 obj
      <<
        /Length 200
      >>
      stream
      BT
      /F1 12 Tf
      100 700 Td
      (QR Code: ${generatedQR.code}) Tj
      0 -20 Td
      (Type: ${formData.type.toUpperCase()}) Tj
      0 -20 Td
      (Scan to activate) Tj
      ET
      endstream
      endobj
      
      xref
      0 5
      0000000000 65535 f 
      0000000009 00000 n 
      0000000058 00000 n 
      0000000115 00000 n 
      0000000204 00000 n 
      trailer
      <<
        /Size 5
        /Root 1 0 R
      >>
      startxref
      404
      %%EOF
    `

    const blob = new Blob([pdfContent], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `qr-code-${generatedQR.code}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const downloadAsTXT = () => {
    if (!generatedQR) return

    const txtContent = `
QR Code Information
==================

Code: ${generatedQR.code}
Type: ${formData.type.toUpperCase()}
Scan URL: ${generatedQR.qrUrl}

Instructions:
1. Print this QR code or save the image
2. Attach it to your ${formData.type}
3. When someone finds it, they can scan the QR code
4. They will be guided to fill in their contact details
5. You'll be notified when your ${formData.type} is found

Generated on: ${new Date().toLocaleString()}
    `.trim()

    const blob = new Blob([txtContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `qr-code-${generatedQR.code}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExport = () => {
    switch (exportFormat) {
      case 'png':
        downloadQR()
        break
      case 'svg':
        downloadAsSVG()
        break
      case 'pdf':
        downloadAsPDF()
        break
      case 'txt':
        downloadAsTXT()
        break
      default:
        downloadQR()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Generate QR Code</h2>
        <p className="text-gray-600">Create blank QR codes - users will add their item/pet/emergency details when scanning</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>QR Code Type</CardTitle>
            <CardDescription>
              Select QR code type - users will add all details when scanning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="type">QR Code Type *</Label>
                <Select value={formData.type} onValueChange={(value: "item" | "pet" | "emergency" | "any") => handleInputChange("type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select QR code type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="item">📱 Item</SelectItem>
                    <SelectItem value="pet">🐕 Pet</SelectItem>
                    <SelectItem value="emergency">🚨 Emergency</SelectItem>
                    <SelectItem value="any">🎯 Any Type</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Four types are available: Item, Pet, Emergency, and Any Type</p>
              </div>

              {/* No additional fields needed - users will fill everything when scanning */}

              {/* Note about the process */}
              <div className="border-t pt-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2 text-blue-900">📝 How It Works</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    <strong>Admin generates blank QR codes for Items, Pets, Emergency contacts, and Any Type.</strong>
                  </p>
                  <p className="text-sm text-blue-700 mb-2">
                    <strong>Any Type QR codes:</strong> When scanned, users can choose whether it's an Item, Pet, or Emergency tag.
                  </p>
                  <p className="text-sm text-blue-700">
                    When users scan the QR code, they will:
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
                    <li>{formData.type === 'any' ? 'Choose the tag type (Item, Pet, or Emergency)' : `Fill in their ${formData.type} details (name, description, etc.)`}</li>
                    <li>Add their contact information</li>
                    <li>Activate the QR code</li>
                    <li>Receive confirmation email</li>
                  </ul>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Generating..." : "Generate QR Code"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Generated QR Code */}
        {generatedQR && (
          <Card>
            <CardHeader>
              <CardTitle>✅ QR Code Generated Successfully!</CardTitle>
              <CardDescription>
                Code: {generatedQR.code} | Type: {formData.type.toUpperCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={generatedQR.qrImageUrl}
                  alt="Generated QR Code"
                  className="w-48 h-48 border rounded-lg"
                />
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">✅ Blank QR Code Generated</h4>
                <p className="text-sm text-green-700 mb-2">
                  <strong>Type:</strong> {formData.type.toUpperCase()} QR Code
                </p>
                <p className="text-sm text-green-700 mb-2">
                  Users will scan this QR code and fill in all their {formData.type} details and contact information.
                </p>
                <p className="text-sm text-green-600">
                  <strong>Export Options:</strong> Choose from PNG, SVG, PDF, or TXT formats below.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Scan URL (for testing)</Label>
                <div className="flex space-x-2">
                  <Input
                    value={generatedQR.qrUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedQR.qrUrl)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Export Format Selection */}
              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select value={exportFormat} onValueChange={(value: "png" | "svg" | "pdf" | "txt") => setExportFormat(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select export format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">
                      <div className="flex items-center space-x-2">
                        <FileImage className="h-4 w-4" />
                        <span>PNG Image</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="svg">
                      <div className="flex items-center space-x-2">
                        <File className="h-4 w-4" />
                        <span>SVG Vector</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pdf">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>PDF Document</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="txt">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Text File</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Export Buttons */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleExport} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export as {exportFormat.toUpperCase()}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setGeneratedQR(null)}
                    className="w-full"
                  >
                    Generate New
                  </Button>
                </div>

                {/* Sticker Editor Button */}
                <Button
                  onClick={() => setShowStickerEditor(true)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Palette className="h-4 w-4 mr-2" />
                  Design Custom Sticker
                </Button>
                
                {/* Quick Export Buttons */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Quick Export:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadQR}
                      className="flex items-center justify-center"
                    >
                      <FileImage className="h-4 w-4 mr-1" />
                      PNG
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAsSVG}
                      className="flex items-center justify-center"
                    >
                      <File className="h-4 w-4 mr-1" />
                      SVG
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAsPDF}
                      className="flex items-center justify-center"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAsTXT}
                      className="flex items-center justify-center"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      TXT
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Navigate to full-screen editor */}
      {showStickerEditor && generatedQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
            <h3 className="text-xl font-bold mb-4">Open Full-Screen Editor</h3>
            <p className="text-gray-600 mb-6">
              The QR sticker editor will open in a new full-screen page for the best editing experience.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowStickerEditor(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const params = new URLSearchParams({
                    qrCodeUrl: generatedQR.qrImageUrl,
                    qrCode: generatedQR.code
                  })
                  window.open(`/qr-editor?${params.toString()}`, '_blank')
                  setShowStickerEditor(false)
                }}
                className="flex-1"
              >
                Open Editor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
