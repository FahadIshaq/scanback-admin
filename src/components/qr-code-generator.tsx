"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Copy, Check, FileImage, FileText, File, Palette, Tag, PawPrint, Layers } from "lucide-react"
import adminApiClient from "@/lib/api"
import jsPDF from "jspdf"
import { MedicalCross } from "@/components/MedicalCross"
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

type GeneratedQR = {
  code: string
  qrImageUrl: string
  qrUrl: string
  metadata?: Record<string, any>
}

type GenerationMode = "connected" | "unique"

const DEFAULT_QR_COLOR = "#000000"

const hexToRgb = (hexColor: string) => {
  if (!hexColor) {
    return { r: 0, g: 0, b: 0 }
  }

  let normalized = hexColor.replace("#", "").trim()
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map(char => char + char)
      .join("")
  }

  if (normalized.length !== 6 || Number.isNaN(parseInt(normalized, 16))) {
    return { r: 0, g: 0, b: 0 }
  }

  const numericValue = parseInt(normalized, 16)
  return {
    r: (numericValue >> 16) & 255,
    g: (numericValue >> 8) & 255,
    b: numericValue & 255
  }
}

export function QRCodeGenerator() {
  const [formData, setFormData] = useState({
    type: "item" as "item" | "pet" | "emergency" | "general",
    clientId: undefined as string | undefined
  })
  const [clients, setClients] = useState<Array<{ _id: string; name: string }>>([])

  const [generatedQRCodes, setGeneratedQRCodes] = useState<GeneratedQR[]>([])
  const [generationMode, setGenerationMode] = useState<GenerationMode>("connected")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exportFormat, setExportFormat] = useState<"png" | "svg" | "pdf" | "txt">("png")
  const [copiesCount, setCopiesCount] = useState(1)
  const [uniqueCount, setUniqueCount] = useState(1)
  const [connectedQuantity, setConnectedQuantity] = useState(1)
  const [lineColor, setLineColor] = useState(DEFAULT_QR_COLOR)
  const [transparentBackground, setTransparentBackground] = useState(true)
  const [isBuildingSheet, setIsBuildingSheet] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingGeneration, setPendingGeneration] = useState<{ mode: GenerationMode; count: number } | null>(null)

  const primaryQR = generatedQRCodes[0] ?? null
  const hasGeneratedCodes = generatedQRCodes.length > 0

  const sanitizeCount = (value: number) => {
    if (Number.isNaN(value)) return 1
    return Math.max(1, Math.floor(value))
  }

  const normalizeColorValue = (value: string) => {
    if (!value) return DEFAULT_QR_COLOR
    let normalized = value.trim()
    if (!normalized.startsWith("#")) {
      normalized = `#${normalized}`
    }
    if (normalized.length === 4) {
      normalized = `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`
    }
    if (normalized.length !== 7) {
      normalized = DEFAULT_QR_COLOR
    }
    return normalized
  }

  const handleLineColorChange = (value: string) => {
    setLineColor(normalizeColorValue(value))
  }

  const stylizeQRImage = (imageUrl: string, options?: { lineColor?: string; transparentBackground?: boolean }) => {
    return new Promise<HTMLCanvasElement>((resolve, reject) => {
      const img = new window.Image()
      img.crossOrigin = "anonymous"
      img.src = imageUrl

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error("Unable to create canvas context"))
          return
        }

        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        const { r: lineR, g: lineG, b: lineB } = hexToRgb(options?.lineColor || DEFAULT_QR_COLOR)
        const makeTransparent = options?.transparentBackground !== false

        for (let i = 0; i < data.length; i += 4) {
          const pixelR = data[i]
          const pixelG = data[i + 1]
          const pixelB = data[i + 2]
          const brightness = (pixelR + pixelG + pixelB) / 3

          if (brightness > 240) {
            if (makeTransparent) {
              data[i + 3] = 0
            } else {
              data[i] = 255
              data[i + 1] = 255
              data[i + 2] = 255
              data[i + 3] = 255
            }
          } else {
            data[i] = lineR
            data[i + 1] = lineG
            data[i + 2] = lineB
            data[i + 3] = 255
          }
        }

        ctx.putImageData(imageData, 0, 0)
        resolve(canvas)
      }

      img.onerror = (error) => {
        reject(error)
      }
    })
  }

  // Load clients on mount
  useEffect(() => {
    adminApiClient.getAllClients().then(response => {
      if (response.success && response.data.clients) {
        // Filter to only show active clients
        const activeClients = response.data.clients.filter((s: any) => s.isActive !== false)
        setClients(activeClients)
      }
    }).catch(err => {
      console.error("Failed to load clients:", err)
    })
  }, [])

  const handleInputChange = (field: string, value: string | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const executeGeneration = async () => {
    setLoading(true)
    setGeneratedQRCodes([])

    try {
      // Admin generates blank QR codes - users fill all details when scanning
      const qrData = {
        type: formData.type,
        details: {},
        contact: {}
      }

      if (generationMode === "connected") {
        const desiredConnectedCount = sanitizeCount(connectedQuantity)
        if (desiredConnectedCount !== connectedQuantity) {
          setConnectedQuantity(desiredConnectedCount)
        }

        const response = await adminApiClient.generateQRCode({
          ...qrData,
          clientId: formData.clientId || undefined,
          quantity: desiredConnectedCount,
          mode: 'connected'
        }) as any
        
        if (response.success) {
          setGeneratedQRCodes([{
            code: response.data.qrCode.code,
            qrImageUrl: response.data.qrImageDataURL,
            qrUrl: response.data.qrUrl,
            metadata: response.data.qrCode.metadata
          }])
        }
      } else {
        const desiredUniqueCount = sanitizeCount(uniqueCount)
        if (desiredUniqueCount !== uniqueCount) {
          setUniqueCount(desiredUniqueCount)
        }

        // For unique mode, make a single API call with quantity and mode
        const response = await adminApiClient.generateQRCode({
          ...qrData,
          clientId: formData.clientId || undefined,
          quantity: desiredUniqueCount,
          mode: 'unique'
        }) as any

        if (response.success) {
          // If the backend returns allQRCodes, use those; otherwise use the single QR code
          if (response.data.allQRCodes && response.data.allQRCodes.length > 0) {
            const created = response.data.allQRCodes.map((qr: any) => ({
              code: qr.qrCode.code,
              qrImageUrl: qr.qrImageDataURL,
              qrUrl: qr.qrUrl,
              metadata: qr.qrCode.metadata
            }))
            setGeneratedQRCodes(created)
          } else {
            // Fallback: single QR code (shouldn't happen for unique mode with quantity > 1)
            setGeneratedQRCodes([{
              code: response.data.qrCode.code,
              qrImageUrl: response.data.qrImageDataURL,
              qrUrl: response.data.qrUrl,
              metadata: response.data.qrCode.metadata
            }])
          }
        } else {
          throw new Error("No QR codes were generated. Please try again.")
        }
      }
    } catch (error: unknown) {
      console.error("Failed to generate QR code:", error)
      alert((error as Error).message || "Failed to generate QR code")
    } finally {
      setLoading(false)
      setPendingGeneration(null)
    }
  }

  const handleGenerationRequest = (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    const connectedCount = sanitizeCount(connectedQuantity)
    if (connectedCount !== connectedQuantity) {
      setConnectedQuantity(connectedCount)
    }
    const desiredUniqueCount = sanitizeCount(uniqueCount)
    if (desiredUniqueCount !== uniqueCount) {
      setUniqueCount(desiredUniqueCount)
    }
    const count = generationMode === "connected" ? connectedCount : desiredUniqueCount
    setPendingGeneration({ mode: generationMode, count })
    setConfirmDialogOpen(true)
  }

  const handleConfirmGeneration = async () => {
    setConfirmDialogOpen(false)
    await executeGeneration()
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
    if (!primaryQR) return

    const link = document.createElement('a')
    link.href = primaryQR.qrImageUrl
    link.download = `qr-code-${primaryQR.code}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadTransparentPNG = async () => {
    if (!primaryQR) return

    try {
      const canvas = await stylizeQRImage(primaryQR.qrImageUrl, {
        lineColor: DEFAULT_QR_COLOR,
        transparentBackground: true
      })
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `qr-code-${primaryQR.code}-transparent.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Failed to create transparent PNG", error)
      alert("Unable to create transparent PNG. Please try again.")
    }
  }

  const downloadStyledPNG = async () => {
    if (!primaryQR) return

    try {
      const canvas = await stylizeQRImage(primaryQR.qrImageUrl, {
        lineColor,
        transparentBackground
      })
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `qr-code-${primaryQR.code}-styled.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Failed to create styled PNG", error)
      alert("Unable to create the styled PNG. Please try again.")
    }
  }

  const downloadSheetPDF = async () => {
    if (generationMode === "connected" && !primaryQR) return
    if (generationMode === "unique" && generatedQRCodes.length === 0) return

    const desiredCopies = generationMode === "connected"
      ? sanitizeCount(copiesCount)
      : generatedQRCodes.length

    if (generationMode === "connected") {
      setCopiesCount(desiredCopies)
    }

    if (desiredCopies === 0) {
      alert("No QR codes are available for export yet.")
      return
    }

    setIsBuildingSheet(true)
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 5
      const codeSizeMm = 20
      const gapMm = 2

      const usableWidth = pageWidth - margin * 2
      const usableHeight = pageHeight - margin * 2
      const columns = Math.max(1, Math.floor((usableWidth + gapMm) / (codeSizeMm + gapMm)))
      const rowsPerPage = Math.max(1, Math.floor((usableHeight + gapMm) / (codeSizeMm + gapMm)))
      const codesPerPage = columns * rowsPerPage

      if (codesPerPage === 0) {
        throw new Error("Page format cannot accommodate the requested QR size.")
      }

      let qrImages: string[] = []

      if (generationMode === "connected" && primaryQR) {
        const canvas = await stylizeQRImage(primaryQR.qrImageUrl, {
          lineColor,
          transparentBackground
        })
        const dataUrl = canvas.toDataURL("image/png")
        qrImages = Array.from({ length: desiredCopies }, () => dataUrl)
      } else {
        const styledCanvases = await Promise.all(
          generatedQRCodes.map(code =>
            stylizeQRImage(code.qrImageUrl, {
              lineColor,
              transparentBackground
            })
          )
        )
        qrImages = styledCanvases.map(canvas => canvas.toDataURL("image/png"))
      }

      let placed = 0
      let currentPage = 0

      while (placed < qrImages.length) {
        if (currentPage > 0) {
          pdf.addPage()
        }

        for (let row = 0; row < rowsPerPage && placed < qrImages.length; row++) {
          for (let col = 0; col < columns && placed < qrImages.length; col++) {
            const x = margin + col * (codeSizeMm + gapMm)
            const y = margin + row * (codeSizeMm + gapMm)
            pdf.addImage(qrImages[placed], "PNG", x, y, codeSizeMm, codeSizeMm, undefined, "FAST")
            placed += 1
          }
        }

        currentPage += 1
      }

      const filename =
        generationMode === "connected" && primaryQR
          ? `qr-code-${primaryQR.code}-x${desiredCopies}`
          : `qr-batch-${generatedQRCodes.length}-codes`

      pdf.save(`${filename}.pdf`)
    } catch (error) {
      console.error("Failed to build PDF sheet", error)
      alert("Unable to build the PDF sheet. Please try again.")
    } finally {
      setIsBuildingSheet(false)
    }
  }

  const downloadTransparentWhitePNG = async () => {
    if (!primaryQR) return

    try {
      const canvas = await stylizeQRImage(primaryQR.qrImageUrl, {
        lineColor: "#FFFFFF",
        transparentBackground: true
      })
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `qr-code-${primaryQR.code}-transparent-white.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Failed to create transparent white PNG", error)
      alert("Unable to create transparent white PNG. Please try again.")
    }
  }

  const downloadAsSVG = () => {
    if (!primaryQR) return

    const svgContent = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="white" stroke="#000" stroke-width="2"/>
        <text x="100" y="100" text-anchor="middle" font-family="monospace" font-size="12" fill="#000">
          QR Code: ${primaryQR.code}
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
    link.download = `qr-code-${primaryQR.code}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const downloadAsPDF = () => {
    if (!primaryQR) return

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
      (QR Code: ${primaryQR.code}) Tj
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
    link.download = `qr-code-${primaryQR.code}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const downloadAsTXT = () => {
    if (!primaryQR) return

    const txtContent = `
QR Code Information
==================

Code: ${primaryQR.code}
Type: ${formData.type.toUpperCase()}
Scan URL: ${primaryQR.qrUrl}

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
    link.download = `qr-code-${primaryQR.code}.txt`
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
            <form onSubmit={handleGenerationRequest} className="space-y-4">
              {/* Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="type">QR Code Type *</Label>
                <Select value={formData.type} onValueChange={(value: "item" | "pet" | "emergency" | "general") => handleInputChange("type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select QR code type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="item">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-md bg-blue-50">
                          <Tag className="h-4 w-4 text-blue-600" />
                        </span>
                        <span className="text-sm font-medium text-gray-900">Item</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pet">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-md bg-yellow-50">
                          <PawPrint className="h-4 w-4 text-yellow-600" />
                        </span>
                        <span className="text-sm font-medium text-gray-900">Pet</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="emergency">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-md bg-red-50">
                          <MedicalCross className="text-red-600" size={16} />
                        </span>
                        <span className="text-sm font-medium text-gray-900">Emergency</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="general">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-md bg-purple-50">
                          <Layers className="h-4 w-4 text-purple-600" />
                        </span>
                        <span className="text-sm font-medium text-gray-900">General</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Four types are available: Item, Pet, Emergency, and General</p>
              </div>

              {/* Client Selection */}
              <div>
                <Label htmlFor="client">Client (Optional)</Label>
                <Select 
                  value={formData.clientId || "none"} 
                  onValueChange={(value) => handleInputChange("clientId", value === "none" ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Client</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client._id} value={client._id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Assign this stock to a client for tracking</p>
              </div>

              <div className="space-y-2">
                <Label>QR Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={generationMode === "connected" ? "default" : "outline"}
                    onClick={() => setGenerationMode("connected")}
                    className="w-full"
                  >
                    Connected
                  </Button>
                  <Button
                    type="button"
                    variant={generationMode === "unique" ? "default" : "outline"}
                    onClick={() => setGenerationMode("unique")}
                    className="w-full"
                  >
                    Unique
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Connected = create one QR and duplicate it. Unique = generate multiple brand-new QR codes at once.
                </p>
              </div>

              {generationMode === "connected" && (
                <div className="space-y-2">
                  <Label htmlFor="connectedCount">How many connected QR codes?</Label>
                  <Input
                    id="connectedCount"
                    type="number"
                    min={1}
                    value={connectedQuantity}
                    onChange={event => setConnectedQuantity(Number(event.target.value))}
                  />
                  <p className="text-xs text-gray-500">
                    We&apos;ll generate one QR code and track this quantity for inventory purposes.
                  </p>
                </div>
              )}

              {generationMode === "unique" && (
                <div className="space-y-2">
                  <Label htmlFor="uniqueCount">How many unique QR codes?</Label>
                  <Input
                    id="uniqueCount"
                    type="number"
                    min={1}
                    value={uniqueCount}
                    onChange={event => setUniqueCount(Number(event.target.value))}
                  />
                </div>
              )}

              {/* No additional fields needed - users will fill everything when scanning */}

              {/* Note about the process */}
              <div className="border-t pt-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2 text-blue-900">📝 How It Works</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    <strong>Admin generates blank QR codes for Items, Pets, Emergency contacts, and General.</strong>
                  </p>
                  <p className="text-sm text-blue-700 mb-2">
                    <strong>General QR codes:</strong> When scanned, users can choose whether it&apos;s an Item, Pet, or Emergency tag.
                  </p>
                  <p className="text-sm text-blue-700">
                    When users scan the QR code, they will:
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
                    <li>{formData.type === 'general' ? 'Choose the tag type (Item, Pet, or Emergency)' : `Fill in their ${formData.type} details (name, description, etc.)`}</li>
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
        {hasGeneratedCodes && primaryQR && (
          <Card>
            <CardHeader>
              <CardTitle>✅ QR Code Generated Successfully!</CardTitle>
              <CardDescription>
                Primary Code: {primaryQR.code} | Mode: {generationMode === "connected" ? "Connected (identical copies)" : "Unique batch"} | Type: {formData.type.toUpperCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Image
                  src={primaryQR.qrImageUrl}
                  alt="Generated QR Code"
                  width={192}
                  height={192}
                  className="border rounded-lg"
                />
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">✅ Blank QR Code Generated</h4>
                <p className="text-sm text-green-700 mb-2">
                  <strong>Type:</strong> {formData.type.toUpperCase()} QR Code
                </p>
                {generationMode === "connected" && (
                  <p className="text-sm text-green-700 mb-2">
                    <strong>Quantity recorded:</strong>{" "}
                    {primaryQR.metadata?.connectedQuantity ?? sanitizeCount(connectedQuantity)} copies
                  </p>
                )}
                <p className="text-sm text-green-700 mb-2">
                  Users will scan this QR code and fill in all their {formData.type} details and contact information.
                </p>
                <p className="text-sm text-green-600">
                  <strong>Export Options:</strong> Choose from PNG, SVG, PDF, or TXT formats below.
                </p>
              </div>

              {generationMode === "unique" && (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    Generated <strong>{generatedQRCodes.length}</strong> unique QR codes. First few codes:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {generatedQRCodes.slice(0, 8).map(code => (
                      <span key={code.code} className="text-xs font-mono bg-white border rounded px-2 py-1">
                        {code.code}
                      </span>
                    ))}
                    {generatedQRCodes.length > 8 && (
                      <span className="text-xs text-gray-500">+{generatedQRCodes.length - 8} more</span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Scan URL (for testing)</Label>
                <div className="flex space-x-2">
                  <Input
                    value={primaryQR.qrUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(primaryQR.qrUrl)}
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
                    onClick={() => setGeneratedQRCodes([])}
                    className="w-full"
                  >
                    Generate New
                  </Button>
                </div>

                {/* Photopea Editor Button */}
                <Button
                  onClick={() => {
                    if (primaryQR && generationMode === "connected") {
                      // Open Photopea in new tab with 900x900 canvas
                      const canvasWidth = 900
                      const canvasHeight = 900
                      const dpi = 300             // High DPI for print quality
                      // Photopea URL format with new document settings
                      const photopeaConfig = {
                        files: [primaryQR.qrImageUrl],
                        environment: {
                          newdoc: [canvasWidth, canvasHeight, "px", dpi, "RGB"]
                        }
                      }
                      const photopeaUrl = `https://www.photopea.com/#${encodeURIComponent(JSON.stringify(photopeaConfig))}`
                      window.open(photopeaUrl, '_blank')
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!primaryQR || generationMode === "unique"}
                  title={generationMode === "unique" ? "Photopea editing is available for single (connected) QR codes." : undefined}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  Edit in Photopea (Free)
                </Button>
                
                <div className="space-y-2 border rounded-lg p-3">
                  <div>
                    <Label htmlFor="lineColorPicker">QR Styling</Label>
                    <p className="text-xs text-gray-500">Set the line color and transparency before exporting styled PNGs or PDF sheets.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="flex items-center gap-3">
                      <input
                        id="lineColorPicker"
                        type="color"
                        value={lineColor}
                        onChange={event => handleLineColorChange(event.target.value)}
                        className="h-10 w-14 rounded border border-gray-300"
                      />
                      <Input
                        value={lineColor}
                        onChange={event => handleLineColorChange(event.target.value)}
                        className="w-32"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={transparentBackground}
                        onChange={event => setTransparentBackground(event.target.checked)}
                        className="h-4 w-4"
                      />
                      Remove background (transparent)
                    </label>
                  </div>
                </div>

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
                      onClick={downloadTransparentPNG}
                      className="flex items-center justify-center"
                    >
                      <FileImage className="h-4 w-4 mr-1" />
                      PNG (Transparent)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadTransparentWhitePNG}
                      className="flex items-center justify-center"
                    >
                      <FileImage className="h-4 w-4 mr-1" />
                      PNG (Transparent White)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadStyledPNG}
                      className="flex items-center justify-center"
                    >
                      <FileImage className="h-4 w-4 mr-1" />
                      PNG (Styled)
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

                {/* Bulk PDF Sheet */}
                <div className="space-y-2 border rounded-lg p-3">
                  <div>
                    <Label htmlFor="copiesCount">Bulk Print Sheet</Label>
                    <p className="text-xs text-gray-500">
                      Create a high-resolution A4 PDF grid using the styling options above.
                    </p>
                  </div>
                  {generationMode === "connected" ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Input
                        id="copiesCount"
                        type="number"
                        min={1}
                        max={500}
                        value={copiesCount}
                        onChange={event => setCopiesCount(Number(event.target.value))}
                        className="w-full sm:w-32"
                      />
                      <Button
                        onClick={downloadSheetPDF}
                        disabled={isBuildingSheet || !primaryQR}
                        className="w-full sm:flex-1"
                      >
                        {isBuildingSheet ? "Building PDF..." : `Download ${sanitizeCount(copiesCount)} Copies PDF`}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-gray-600">
                        Unique codes ready: <span className="font-mono">{generatedQRCodes.length}</span>
                      </p>
                      <Button
                        onClick={downloadSheetPDF}
                        disabled={isBuildingSheet || generatedQRCodes.length === 0}
                        className="w-full"
                      >
                        {isBuildingSheet ? "Building PDF..." : `Download ${generatedQRCodes.length} Unique Codes PDF`}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog
        open={confirmDialogOpen}
        
        onOpenChange={(open) => {
          setConfirmDialogOpen(open)
          if (!open && !loading) {
            setPendingGeneration(null)
          }
        }}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Generate QR codes?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingGeneration
                ? `This will generate ${pendingGeneration.count} ${pendingGeneration.mode === "connected" ? "connected" : "unique"} QR code${pendingGeneration.count === 1 ? "" : "s"}. This action can’t be undone.`
                : "This action can’t be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGeneration} disabled={loading}>
              {loading ? "Generating..." : "Yes, generate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
