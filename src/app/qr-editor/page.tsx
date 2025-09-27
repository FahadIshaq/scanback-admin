'use client'

import { QRStickerEditor } from '@/components/qr-sticker-editor'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function QREditorContent() {
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

export default function QREditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading QR Editor...</p>
        </div>
      </div>
    }>
      <QREditorContent />
    </Suspense>
  )
}
