'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, X, ExternalLink } from "lucide-react"

interface PhotopeaEditorProps {
  qrCodeUrl: string
  qrCode: string
  onClose?: () => void
}

export function PhotopeaEditor({ qrCodeUrl, qrCode, onClose }: PhotopeaEditorProps) {
  const [photopeaUrl, setPhotopeaUrl] = useState('https://www.photopea.com/')

  useEffect(() => {
    // Photopea can open images directly via URL parameter
    // Format: https://www.photopea.com/#%7B%22files%22:%5B%22IMAGE_URL%22%5D%7D
    if (qrCodeUrl) {
      const encodedUrl = encodeURIComponent(qrCodeUrl)
      const photopeaUrlWithImage = `https://www.photopea.com/#%7B%22files%22:%5B%22${encodedUrl}%22%5D%7D`
      setPhotopeaUrl(photopeaUrlWithImage)
    }
  }, [qrCodeUrl])

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Photopea Editor</h2>
          <span className="text-sm text-gray-500">Free Photoshop-like editor</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(photopeaUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Photopea iframe */}
      <div className="flex-1 relative">
        <iframe
          src={photopeaUrl}
          className="w-full h-full border-0"
          title="Photopea Editor"
          allow="clipboard-read; clipboard-write"
        />
      </div>

      {/* Instructions Footer */}
      <div className="bg-blue-50 border-t px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> Your QR code should load automatically. If not, go to <strong>File → Open from URL</strong> and paste: <code className="bg-blue-100 px-1 rounded">{qrCodeUrl}</code>
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Photopea is a free, browser-based image editor. When finished, use <strong>File → Export As → PNG</strong> to download your sticker.
          </p>
        </div>
      </div>
    </div>
  )
}

