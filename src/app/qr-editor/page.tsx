'use client'

import { QRStickerEditor } from '@/components/qr-sticker-editor'
import { useSearchParams } from 'next/navigation'

export default function QREditorPage() {
  const searchParams = useSearchParams()
  const qrCodeUrl = searchParams.get('qrCodeUrl')
  const qrCode = searchParams.get('qrCode')

  if (!qrCodeUrl || !qrCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">QR Code Required</h1>
          <p className="text-gray-600">Please generate a QR code first to use the editor.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <QRStickerEditor 
        qrCodeUrl={qrCodeUrl} 
        qrCode={qrCode}
      />
    </div>
  )
}
