'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Copy, Check, FileImage, FileText, File, Palette, Square, Circle, Hexagon, Star, Heart, Settings, Type, Image as ImageIcon, RotateCcw, Save, Move, RotateCw, ZoomIn, ZoomOut, Trash2, Layers, Lock, Unlock } from "lucide-react"
import jsPDF from 'jspdf'
import * as fabric from 'fabric'

interface StickerDesign {
  // Shape and Layout
  shape: 'square' | 'circle' | 'rounded' | 'hexagon' | 'star' | 'heart' | 'rectangle'
  width: number
  height: number
  borderRadius: number
  
  // Background
  backgroundColor: string
  backgroundOpacity: number
  backgroundImage?: string
  backgroundSize: 'cover' | 'contain' | 'stretch'
  
  // Border
  borderWidth: number
  borderColor: string
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'double'
  borderOpacity: number
  
  // QR Code
  qrSize: number
  qrPosition: { x: number; y: number }
  qrBackground: string
  qrPadding: number
  
  // Text
  tagline: string
  taglineFont: string
  taglineSize: number
  taglineColor: string
  taglinePosition: { x: number; y: number }
  taglineAlign: 'left' | 'center' | 'right'
  
  // Logo/Icon
  logoUrl?: string
  logoSize: number
  logoPosition: { x: number; y: number }
  
  // Effects
  shadow: boolean
  shadowColor: string
  shadowBlur: number
  shadowOffset: { x: number; y: number }
  
  // Export
  exportFormat: 'png' | 'svg' | 'pdf' | 'jpg'
  exportQuality: number
  exportDpi: number
}

export function QRStickerEditor({ qrCodeUrl, qrCode }: { qrCodeUrl: string; qrCode: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [design, setDesign] = useState<StickerDesign>({
    // Shape and Layout
    shape: 'rounded',
    width: 400,
    height: 400,
    borderRadius: 20,
    
    // Background
    backgroundColor: '#ffffff',
    backgroundOpacity: 1,
    backgroundSize: 'cover',
    
    // Border
    borderWidth: 2,
    borderColor: '#000000',
    borderStyle: 'solid',
    borderOpacity: 1,
    
    // QR Code
    qrSize: 200,
    qrPosition: { x: 100, y: 50 },
    qrBackground: '#ffffff',
    qrPadding: 10,
    
    // Text
    tagline: 'Scan to Activate',
    taglineFont: 'Arial',
    taglineSize: 20,
    taglineColor: '#000000',
    taglinePosition: { x: 200, y: 300 },
    taglineAlign: 'center',
    
    // Logo/Icon
    logoSize: 30,
    logoPosition: { x: 20, y: 20 },
    
    // Effects
    shadow: false,
    shadowColor: '#000000',
    shadowBlur: 5,
    shadowOffset: { x: 2, y: 2 },
    
    // Export
    exportFormat: 'png',
    exportQuality: 0.9,
    exportDpi: 300
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null)
  const [canvasObjects, setCanvasObjects] = useState<fabric.Object[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: design.width,
      height: design.height,
      backgroundColor: 'transparent', // Transparent background
      selection: true,
      preserveObjectStacking: true,
    })

    fabricCanvasRef.current = canvas

    // Add event listeners
    canvas.on('selection:created', (e: any) => {
      setSelectedObject(e.selected?.[0] || null)
    })

    canvas.on('selection:updated', (e: any) => {
      setSelectedObject(e.selected?.[0] || null)
    })

    canvas.on('selection:cleared', () => {
      setSelectedObject(null)
    })

    canvas.on('object:added', () => {
      setCanvasObjects(canvas.getObjects())
    })

    canvas.on('object:removed', () => {
      setCanvasObjects(canvas.getObjects())
    })

    canvas.on('object:modified', () => {
      setCanvasObjects(canvas.getObjects())
    })

    // Load initial design only once
    if (!isInitialized) {
      loadDesignToCanvas()
      setIsInitialized(true)
    }

    return () => {
      canvas.dispose()
    }
  }, [])

  // Update canvas when design changes (but not on initial load to prevent duplicates)
  useEffect(() => {
    if (fabricCanvasRef.current && canvasObjects.length > 0) {
      loadDesignToCanvas()
    }
  }, [design.shape, design.width, design.height, design.backgroundColor, design.borderWidth, design.borderColor])

  const loadDesignToCanvas = async () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    canvas.clear()

    // Set canvas size and background
    canvas.setWidth(design.width)
    canvas.setHeight(design.height)
    // Set transparent background
    canvas.backgroundColor = 'transparent'

    // Create background shape
    await createBackgroundShape()

    // Add QR code
    await addQRCode()

    // Add text only if tagline is provided
    if (design.tagline && design.tagline.trim()) {
      addTaglineText()
    }

    // Add logo if provided
    if (design.logoUrl) {
      await addLogo()
    }

    canvas.renderAll()
  }

  const createBackgroundShape = async () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const { shape, width, height, borderRadius, borderWidth, borderColor, borderStyle, borderOpacity } = design

    let shapeObject: fabric.Object

    switch (shape) {
      case 'circle':
        shapeObject = new fabric.Circle({
          radius: Math.min(width, height) / 2,
          left: width / 2,
          top: height / 2,
          originX: 'center',
          originY: 'center',
          fill: design.backgroundColor,
          stroke: borderWidth > 0 ? borderColor : undefined,
          strokeWidth: borderWidth,
          strokeDashArray: getStrokeDashArray(borderStyle),
          opacity: design.backgroundOpacity,
        })
        break

      case 'rounded':
        shapeObject = new fabric.Rect({
          width: width,
          height: height,
          left: 0,
          top: 0,
          rx: borderRadius,
          ry: borderRadius,
          fill: design.backgroundColor,
          stroke: borderWidth > 0 ? borderColor : undefined,
          strokeWidth: borderWidth,
          strokeDashArray: getStrokeDashArray(borderStyle),
          opacity: design.backgroundOpacity,
        })
        break

      case 'hexagon':
        const hexPoints = createHexagonPoints(width / 2, height / 2, Math.min(width, height) / 2)
        shapeObject = new fabric.Polygon(hexPoints, {
          fill: design.backgroundColor,
          stroke: borderWidth > 0 ? borderColor : undefined,
          strokeWidth: borderWidth,
          strokeDashArray: getStrokeDashArray(borderStyle),
          opacity: design.backgroundOpacity,
        })
        break

      case 'star':
        const starPoints = createStarPoints(width / 2, height / 2, Math.min(width, height) / 2)
        shapeObject = new fabric.Polygon(starPoints, {
          fill: design.backgroundColor,
          stroke: borderWidth > 0 ? borderColor : undefined,
          strokeWidth: borderWidth,
          strokeDashArray: getStrokeDashArray(borderStyle),
          opacity: design.backgroundOpacity,
        })
        break

      case 'heart':
        const heartPoints = createHeartPoints(width / 2, height / 2, Math.min(width, height) / 2)
        shapeObject = new fabric.Polygon(heartPoints, {
          fill: design.backgroundColor,
          stroke: borderWidth > 0 ? borderColor : undefined,
          strokeWidth: borderWidth,
          strokeDashArray: getStrokeDashArray(borderStyle),
          opacity: design.backgroundOpacity,
        })
        break

      default: // square, rectangle
        shapeObject = new fabric.Rect({
          width: width,
          height: height,
          left: 0,
          top: 0,
          fill: design.backgroundColor,
          stroke: borderWidth > 0 ? borderColor : undefined,
          strokeWidth: borderWidth,
          strokeDashArray: getStrokeDashArray(borderStyle),
          opacity: design.backgroundOpacity,
        })
    }

    // Add shadow if enabled
    if (design.shadow) {
      shapeObject.set({
        shadow: new fabric.Shadow({
          color: design.shadowColor,
          blur: design.shadowBlur,
          offsetX: design.shadowOffset.x,
          offsetY: design.shadowOffset.y,
        })
      })
    }

    // Make background non-selectable and send to back
    shapeObject.set({
      selectable: false,
      evented: false,
    })

    canvas.add(shapeObject)
    canvas.sendObjectToBack(shapeObject)
    
    // Set the background shape as the canvas background for export
    canvas.backgroundImage = shapeObject
    canvas.renderAll()
  }

  const addQRCode = async () => {
    if (!fabricCanvasRef.current || !qrCodeUrl) return

    const canvas = fabricCanvasRef.current

    try {
      // Create QR code background
      const qrBackground = new fabric.Rect({
        width: design.qrSize + (design.qrPadding * 2),
        height: design.qrSize + (design.qrPadding * 2),
        left: design.qrPosition.x - design.qrPadding,
        top: design.qrPosition.y - design.qrPadding,
        fill: design.qrBackground,
        selectable: true,
        cornerStyle: 'circle',
        cornerColor: '#007bff',
        cornerSize: 8,
        transparentCorners: false,
      })

      canvas.add(qrBackground)

      // Load QR code image
      fabric.Image.fromURL(qrCodeUrl).then((img: any) => {
        img.set({
          left: design.qrPosition.x,
          top: design.qrPosition.y,
          scaleX: design.qrSize / 200, // Assuming QR is 200px
          scaleY: design.qrSize / 200,
          selectable: true,
          cornerStyle: 'circle',
          cornerColor: '#007bff',
          cornerSize: 8,
          transparentCorners: false,
        })
        canvas.add(img)
        canvas.renderAll()
      })
    } catch (error) {
      console.error('Failed to load QR code image:', error)
    }
  }

  const addTaglineText = () => {
    if (!fabricCanvasRef.current || !design.tagline) return

    const canvas = fabricCanvasRef.current

    const text = new fabric.Text(design.tagline, {
      left: design.taglinePosition.x,
      top: design.taglinePosition.y,
      fontFamily: design.taglineFont,
      fontSize: design.taglineSize,
      fill: design.taglineColor,
      textAlign: design.taglineAlign,
      selectable: true,
      cornerStyle: 'circle',
      cornerColor: '#28a745',
      cornerSize: 8,
      transparentCorners: false,
    })

    canvas.add(text)
  }

  const addLogo = async () => {
    if (!fabricCanvasRef.current || !design.logoUrl) return

    const canvas = fabricCanvasRef.current

    try {
      fabric.Image.fromURL(design.logoUrl).then((img: any) => {
        img.set({
          left: design.logoPosition.x,
          top: design.logoPosition.y,
          scaleX: design.logoSize / 50, // Assuming logo is 50px
          scaleY: design.logoSize / 50,
          selectable: true,
          cornerStyle: 'circle',
          cornerColor: '#ff6b35',
          cornerSize: 8,
          transparentCorners: false,
        })
        canvas.add(img)
        canvas.renderAll()
      })
    } catch (error) {
      console.error('Failed to load logo image:', error)
    }
  }

  // Helper functions for shape creation
  const createHexagonPoints = (centerX: number, centerY: number, radius: number) => {
    const points = []
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i
      points.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      })
    }
    return points
  }

  const createStarPoints = (centerX: number, centerY: number, radius: number) => {
    const points = []
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 5) * i
      const r = i % 2 === 0 ? radius : radius * 0.5
      points.push({
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle)
      })
    }
    return points
  }

  const createHeartPoints = (centerX: number, centerY: number, radius: number) => {
    const points = []
    const numPoints = 20
    for (let i = 0; i < numPoints; i++) {
      const t = (i / (numPoints - 1)) * Math.PI
      const x = 16 * Math.pow(Math.sin(t), 3)
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
      points.push({
        x: centerX + (x * radius) / 16,
        y: centerY + (y * radius) / 16
      })
    }
    return points
  }

  const getStrokeDashArray = (style: string) => {
    switch (style) {
      case 'dashed': return [10, 5]
      case 'dotted': return [2, 3]
      case 'double': return [5, 5, 5, 5]
      default: return undefined
    }
  }

  // Canvas controls
  const deleteSelected = () => {
    if (!fabricCanvasRef.current || !selectedObject) return

    const canvas = fabricCanvasRef.current
    canvas.remove(selectedObject)
    setSelectedObject(null)
  }

  const bringToFront = () => {
    if (!fabricCanvasRef.current || !selectedObject) return

    const canvas = fabricCanvasRef.current
    canvas.bringObjectToFront(selectedObject)
    canvas.renderAll()
  }

  const sendToBack = () => {
    if (!fabricCanvasRef.current || !selectedObject) return

    const canvas = fabricCanvasRef.current
    canvas.sendObjectToBack(selectedObject)
    canvas.renderAll()
  }

  const duplicateSelected = () => {
    if (!fabricCanvasRef.current || !selectedObject) return

    const canvas = fabricCanvasRef.current
    selectedObject.clone().then((cloned: any) => {
      cloned.set({
        left: (selectedObject.left || 0) + 20,
        top: (selectedObject.top || 0) + 20,
      })
      canvas.add(cloned)
      canvas.setActiveObject(cloned)
      canvas.renderAll()
    })
  }

  const lockSelected = () => {
    if (!selectedObject) return

    selectedObject.set({
      selectable: false,
      evented: false,
    })
    fabricCanvasRef.current?.renderAll()
  }

  const unlockAll = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    canvas.getObjects().forEach((obj: any) => {
      obj.set({
        selectable: true,
        evented: true,
      })
    })
    canvas.renderAll()
  }

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    canvas.clear()
    setSelectedObject(null)
    setCanvasObjects([])
    setIsInitialized(false)
  }

  // Add custom text
  const addText = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const text = new fabric.Text('New Text', {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fontSize: 20,
      fill: '#000000',
      selectable: true,
      cornerStyle: 'circle',
      cornerColor: '#28a745',
      cornerSize: 8,
      transparentCorners: false,
    })

    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
  }

  // Add rectangle
  const addRectangle = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const rect = new fabric.Rect({
      width: 100,
      height: 60,
      left: 150,
      top: 150,
      fill: '#ff6b35',
      stroke: '#000000',
      strokeWidth: 2,
      selectable: true,
      cornerStyle: 'circle',
      cornerColor: '#ff6b35',
      cornerSize: 8,
      transparentCorners: false,
    })

    canvas.add(rect)
    canvas.setActiveObject(rect)
    canvas.renderAll()
  }

  // Add circle
  const addCircle = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const circle = new fabric.Circle({
      radius: 50,
      left: 200,
      top: 200,
      fill: '#007bff',
      stroke: '#000000',
      strokeWidth: 2,
      selectable: true,
      cornerStyle: 'circle',
      cornerColor: '#007bff',
      cornerSize: 8,
      transparentCorners: false,
    })

    canvas.add(circle)
    canvas.setActiveObject(circle)
    canvas.renderAll()
  }

  // Add image from URL
  const addImageFromURL = () => {
    const url = prompt('Enter image URL:')
    if (!url || !fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    fabric.Image.fromURL(url).then((img: any) => {
      img.set({
        left: 100,
        top: 100,
        scaleX: 0.5,
        scaleY: 0.5,
        selectable: true,
        cornerStyle: 'circle',
        cornerColor: '#ff6b35',
        cornerSize: 8,
        transparentCorners: false,
      })
      canvas.add(img)
      canvas.setActiveObject(img)
      canvas.renderAll()
    }).catch((error) => {
      alert('Failed to load image: ' + error.message)
    })
  }

  // Add line
  const addLine = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const line = new fabric.Line([50, 50, 200, 200], {
      stroke: '#000000',
      strokeWidth: 3,
      selectable: true,
      cornerStyle: 'circle',
      cornerColor: '#000000',
      cornerSize: 8,
      transparentCorners: false,
    })

    canvas.add(line)
    canvas.setActiveObject(line)
    canvas.renderAll()
  }

  // Add arrow
  const addArrow = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const arrow = new fabric.Line([50, 50, 200, 200], {
      stroke: '#000000',
      strokeWidth: 3,
      selectable: true,
      cornerStyle: 'circle',
      cornerColor: '#000000',
      cornerSize: 8,
      transparentCorners: false,
    })

    // Add arrowhead
    const arrowhead = new fabric.Triangle({
      width: 20,
      height: 20,
      left: 200,
      top: 200,
      fill: '#000000',
      selectable: false,
      evented: false,
    })

    canvas.add(arrow)
    canvas.add(arrowhead)
    canvas.setActiveObject(arrow)
    canvas.renderAll()
  }

  // Add star
  const addStar = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const star = new fabric.Polygon(createStarPoints(100, 100, 50), {
      fill: '#ffd700',
      stroke: '#000000',
      strokeWidth: 2,
      left: 100,
      top: 100,
      selectable: true,
      cornerStyle: 'circle',
      cornerColor: '#ffd700',
      cornerSize: 8,
      transparentCorners: false,
    })

    canvas.add(star)
    canvas.setActiveObject(star)
    canvas.renderAll()
  }

  // Add heart
  const addHeart = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const heart = new fabric.Polygon(createHeartPoints(100, 100, 50), {
      fill: '#ff69b4',
      stroke: '#000000',
      strokeWidth: 2,
      left: 100,
      top: 100,
      selectable: true,
      cornerStyle: 'circle',
      cornerColor: '#ff69b4',
      cornerSize: 8,
      transparentCorners: false,
    })

    canvas.add(heart)
    canvas.setActiveObject(heart)
    canvas.renderAll()
  }

  const exportSticker = async () => {
    if (!fabricCanvasRef.current) return

    setIsGenerating(true)
    
    try {
      const canvas = fabricCanvasRef.current
      
      // Create a new canvas with only the sticker content
      const exportCanvas = new fabric.Canvas(document.createElement('canvas'), {
        width: design.width,
        height: design.height,
        backgroundColor: 'transparent', // Transparent background
      })
      
      // Get all objects from the main canvas
      const objects = canvas.getObjects()
      
      // Clone and add all objects to export canvas
      for (const obj of objects) {
        const cloned = await new Promise<fabric.Object>((resolve) => {
          obj.clone().then((cloned: any) => {
            resolve(cloned)
          })
        })
        exportCanvas.add(cloned)
      }
      
      // Render the export canvas
      exportCanvas.renderAll()
      
      if (design.exportFormat === 'pdf') {
        // Use jsPDF for PDF export
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        })
        
        const imgData = exportCanvas.toDataURL({ 
          format: 'png', 
          multiplier: 1
        })
        const imgWidth = 210 // A4 width in mm
        const imgHeight = (exportCanvas.height! * imgWidth) / exportCanvas.width!
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
        pdf.save(`qr-sticker-${qrCode}.pdf`)
      } else {
        // Use export canvas for other formats
        const dataUrl = exportCanvas.toDataURL({ 
          format: design.exportFormat as any, 
          multiplier: 1
        })
        
        const link = document.createElement('a')
        link.download = `qr-sticker-${qrCode}.${design.exportFormat}`
        link.href = dataUrl
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      
      // Clean up export canvas
      exportCanvas.dispose()
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const resetDesign = () => {
    setDesign({
      shape: 'rounded',
      width: 400,
      height: 400,
      borderRadius: 20,
      backgroundColor: '#ffffff',
      backgroundOpacity: 1,
      backgroundSize: 'cover',
      borderWidth: 2,
      borderColor: '#000000',
      borderStyle: 'solid',
      borderOpacity: 1,
      qrSize: 200,
      qrPosition: { x: 100, y: 50 },
      qrBackground: '#ffffff',
      qrPadding: 10,
      tagline: 'Scan to Activate',
      taglineFont: 'Arial',
      taglineSize: 20,
      taglineColor: '#000000',
      taglinePosition: { x: 200, y: 300 },
      taglineAlign: 'center',
      logoSize: 30,
      logoPosition: { x: 20, y: 20 },
      shadow: false,
      shadowColor: '#000000',
      shadowBlur: 5,
      shadowOffset: { x: 2, y: 2 },
      exportFormat: 'png',
      exportQuality: 0.9,
      exportDpi: 300
    })
  }

  const updateDesign = (key: string, value: any) => {
    setDesign(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">QR Sticker Editor</h1>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={resetDesign}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button size="sm" onClick={exportSticker} disabled={isGenerating}>
              <Download className="h-4 w-4 mr-1" />
              {isGenerating ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Professional Canvas Editor
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Add Elements */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Add Elements</h3>
            <div className="space-y-2">
              <Button variant="outline" size="sm" onClick={addText} className="w-full justify-start">
                <Type className="h-4 w-4 mr-2" />
                Text
              </Button>
              <Button variant="outline" size="sm" onClick={addRectangle} className="w-full justify-start">
                <Square className="h-4 w-4 mr-2" />
                Rectangle
              </Button>
              <Button variant="outline" size="sm" onClick={addCircle} className="w-full justify-start">
                <Circle className="h-4 w-4 mr-2" />
                Circle
              </Button>
              <Button variant="outline" size="sm" onClick={addLine} className="w-full justify-start">
                <Move className="h-4 w-4 mr-2" />
                Line
              </Button>
              <Button variant="outline" size="sm" onClick={addArrow} className="w-full justify-start">
                <Move className="h-4 w-4 mr-2" />
                Arrow
              </Button>
              <Button variant="outline" size="sm" onClick={addStar} className="w-full justify-start">
                <Star className="h-4 w-4 mr-2" />
                Star
              </Button>
              <Button variant="outline" size="sm" onClick={addHeart} className="w-full justify-start">
                <Heart className="h-4 w-4 mr-2" />
                Heart
              </Button>
              <Button variant="outline" size="sm" onClick={addImageFromURL} className="w-full justify-start">
                <ImageIcon className="h-4 w-4 mr-2" />
                Image
              </Button>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Canvas Tools</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" onClick={deleteSelected} disabled={!selectedObject} className="w-full justify-start">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={duplicateSelected} disabled={!selectedObject} className="w-full justify-start">
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" onClick={bringToFront} disabled={!selectedObject} className="w-full justify-start">
                  <Layers className="h-4 w-4 mr-2" />
                  Bring to Front
                </Button>
                <Button variant="outline" size="sm" onClick={sendToBack} disabled={!selectedObject} className="w-full justify-start">
                  <Layers className="h-4 w-4 mr-2" />
                  Send to Back
                </Button>
                <Button variant="outline" size="sm" onClick={lockSelected} disabled={!selectedObject} className="w-full justify-start">
                  <Lock className="h-4 w-4 mr-2" />
                  Lock
                </Button>
                <Button variant="outline" size="sm" onClick={unlockAll} className="w-full justify-start">
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock All
                </Button>
                <Button variant="destructive" size="sm" onClick={clearCanvas} className="w-full justify-start">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Canvas
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Center Canvas */}
        <div className="flex-1 flex items-center justify-center bg-gray-100 p-8">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <canvas
              ref={canvasRef}
              className="border border-gray-300 rounded-lg"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
        </div>

        {/* Right Sidebar - Properties & Settings */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Object Properties */}
            {selectedObject ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Object Properties</h3>
                
                {/* Position */}
                <div className="mb-4">
                  <Label className="text-xs font-medium text-gray-700">Position</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <Label className="text-xs text-gray-500">X</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedObject.left || 0)}
                        onChange={(e) => {
                          selectedObject.set('left', parseInt(e.target.value))
                          fabricCanvasRef.current?.renderAll()
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Y</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedObject.top || 0)}
                        onChange={(e) => {
                          selectedObject.set('top', parseInt(e.target.value))
                          fabricCanvasRef.current?.renderAll()
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Size */}
                <div className="mb-4">
                  <Label className="text-xs font-medium text-gray-700">Size</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <Label className="text-xs text-gray-500">Width</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedObject.width || 0)}
                        onChange={(e) => {
                          selectedObject.set('scaleX', parseInt(e.target.value) / (selectedObject.width || 1))
                          fabricCanvasRef.current?.renderAll()
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Height</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedObject.height || 0)}
                        onChange={(e) => {
                          selectedObject.set('scaleY', parseInt(e.target.value) / (selectedObject.height || 1))
                          fabricCanvasRef.current?.renderAll()
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Rotation */}
                <div className="mb-4">
                  <Label className="text-xs font-medium text-gray-700">Rotation</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedObject.angle || 0)}
                    onChange={(e) => {
                      selectedObject.set('angle', parseInt(e.target.value))
                      fabricCanvasRef.current?.renderAll()
                    }}
                    className="h-8 text-xs mt-1"
                    placeholder="0"
                  />
                </div>

                {/* Opacity */}
                <div className="mb-4">
                  <Label className="text-xs font-medium text-gray-700">Opacity</Label>
                  <Input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={selectedObject.opacity || 1}
                    onChange={(e) => {
                      selectedObject.set('opacity', parseFloat(e.target.value))
                      fabricCanvasRef.current?.renderAll()
                    }}
                    className="mt-1"
                  />
                  <div className="text-xs text-gray-500 mt-1">{Math.round((selectedObject.opacity || 1) * 100)}%</div>
                </div>

                {/* Fill Color */}
                <div className="mb-4">
                  <Label className="text-xs font-medium text-gray-700">Color</Label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      type="color"
                      value={typeof selectedObject.fill === 'string' ? selectedObject.fill : '#000000'}
                      onChange={(e) => {
                        selectedObject.set('fill', e.target.value)
                        fabricCanvasRef.current?.renderAll()
                      }}
                      className="w-12 h-8"
                    />
                    <Input
                      value={typeof selectedObject.fill === 'string' ? selectedObject.fill : '#000000'}
                      onChange={(e) => {
                        selectedObject.set('fill', e.target.value)
                        fabricCanvasRef.current?.renderAll()
                      }}
                      placeholder="#000000"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Text Properties */}
                {selectedObject.type === 'text' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-medium text-gray-700">Font Size</Label>
                      <Input
                        type="number"
                        value={Math.round((selectedObject as any).fontSize || 20)}
                        onChange={(e) => {
                          selectedObject.set('fontSize', parseInt(e.target.value))
                          fabricCanvasRef.current?.renderAll()
                        }}
                        className="h-8 text-xs mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-gray-700">Font Family</Label>
                      <Select 
                        value={(selectedObject as any).fontFamily || 'Arial'} 
                        onValueChange={(value) => {
                          selectedObject.set('fontFamily', value)
                          fabricCanvasRef.current?.renderAll()
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Helvetica">Helvetica</SelectItem>
                          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                          <SelectItem value="Georgia">Georgia</SelectItem>
                          <SelectItem value="Verdana">Verdana</SelectItem>
                          <SelectItem value="Courier New">Courier New</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Settings className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Select an object to edit its properties</p>
              </div>
            )}

            {/* Shape & Size Settings */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Sticker Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-gray-700">Shape</Label>
                  <Select value={design.shape} onValueChange={(value) => updateDesign('shape', value)}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="circle">Circle</SelectItem>
                      <SelectItem value="rounded">Rounded Rectangle</SelectItem>
                      <SelectItem value="rectangle">Rectangle</SelectItem>
                      <SelectItem value="hexagon">Hexagon</SelectItem>
                      <SelectItem value="star">Star</SelectItem>
                      <SelectItem value="heart">Heart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Width (px)</Label>
                    <Input
                      type="number"
                      value={design.width}
                      onChange={(e) => updateDesign('width', parseInt(e.target.value))}
                      min="100"
                      max="1000"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Height (px)</Label>
                    <Input
                      type="number"
                      value={design.height}
                      onChange={(e) => updateDesign('height', parseInt(e.target.value))}
                      min="100"
                      max="1000"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>

                {design.shape === 'rounded' && (
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Border Radius (px)</Label>
                    <Input
                      type="number"
                      value={design.borderRadius}
                      onChange={(e) => updateDesign('borderRadius', parseInt(e.target.value))}
                      min="0"
                      max="100"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Background Settings */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Background</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-gray-700">Background Color</Label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      type="color"
                      value={design.backgroundColor}
                      onChange={(e) => updateDesign('backgroundColor', e.target.value)}
                      className="w-12 h-8"
                    />
                    <Input
                      value={design.backgroundColor}
                      onChange={(e) => updateDesign('backgroundColor', e.target.value)}
                      placeholder="#ffffff"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700">Background Opacity</Label>
                  <Input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={design.backgroundOpacity}
                    onChange={(e) => updateDesign('backgroundOpacity', parseFloat(e.target.value))}
                    className="mt-1"
                  />
                  <div className="text-xs text-gray-500 mt-1">{Math.round(design.backgroundOpacity * 100)}%</div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700">Background Image URL (optional)</Label>
                  <Input
                    value={design.backgroundImage || ''}
                    onChange={(e) => updateDesign('backgroundImage', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Border Settings */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Border</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-gray-700">Border Width (px)</Label>
                  <Input
                    type="number"
                    value={design.borderWidth}
                    onChange={(e) => updateDesign('borderWidth', parseInt(e.target.value))}
                    min="0"
                    max="20"
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700">Border Color</Label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      type="color"
                      value={design.borderColor}
                      onChange={(e) => updateDesign('borderColor', e.target.value)}
                      className="w-12 h-8"
                    />
                    <Input
                      value={design.borderColor}
                      onChange={(e) => updateDesign('borderColor', e.target.value)}
                      placeholder="#000000"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700">Border Style</Label>
                  <Select value={design.borderStyle} onValueChange={(value) => updateDesign('borderStyle', value)}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="dashed">Dashed</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem>
                      <SelectItem value="double">Double</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Text Settings */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Text Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-gray-700">Tagline Text</Label>
                  <Input
                    value={design.tagline}
                    onChange={(e) => updateDesign('tagline', e.target.value)}
                    placeholder="Scan to Activate"
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700">Font Family</Label>
                  <Select value={design.taglineFont} onValueChange={(value) => updateDesign('taglineFont', value)}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Verdana">Verdana</SelectItem>
                      <SelectItem value="Courier New">Courier New</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700">Font Size (px)</Label>
                  <Input
                    type="number"
                    value={design.taglineSize}
                    onChange={(e) => updateDesign('taglineSize', parseInt(e.target.value))}
                    min="8"
                    max="72"
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700">Text Color</Label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      type="color"
                      value={design.taglineColor}
                      onChange={(e) => updateDesign('taglineColor', e.target.value)}
                      className="w-12 h-8"
                    />
                    <Input
                      value={design.taglineColor}
                      onChange={(e) => updateDesign('taglineColor', e.target.value)}
                      placeholder="#000000"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700">Text Alignment</Label>
                  <Select value={design.taglineAlign} onValueChange={(value) => updateDesign('taglineAlign', value)}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Effects Settings */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Effects</h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={design.shadow}
                    onChange={(e) => updateDesign('shadow', e.target.checked)}
                    className="rounded"
                  />
                  <Label className="text-xs font-medium text-gray-700">Drop Shadow</Label>
                </div>

                {design.shadow && (
                  <>
                    <div>
                      <Label className="text-xs font-medium text-gray-700">Shadow Color</Label>
                      <div className="flex space-x-2 mt-1">
                        <Input
                          type="color"
                          value={design.shadowColor}
                          onChange={(e) => updateDesign('shadowColor', e.target.value)}
                          className="w-12 h-8"
                        />
                        <Input
                          value={design.shadowColor}
                          onChange={(e) => updateDesign('shadowColor', e.target.value)}
                          placeholder="#000000"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-gray-700">Shadow Blur (px)</Label>
                      <Input
                        type="number"
                        value={design.shadowBlur}
                        onChange={(e) => updateDesign('shadowBlur', parseInt(e.target.value))}
                        min="0"
                        max="50"
                        className="h-8 text-xs mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-medium text-gray-700">Offset X (px)</Label>
                        <Input
                          type="number"
                          value={design.shadowOffset.x}
                          onChange={(e) => updateDesign('shadowOffset.x', parseInt(e.target.value))}
                          min="-50"
                          max="50"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-700">Offset Y (px)</Label>
                        <Input
                          type="number"
                          value={design.shadowOffset.y}
                          onChange={(e) => updateDesign('shadowOffset.y', parseInt(e.target.value))}
                          min="-50"
                          max="50"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Export Settings */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Export Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-gray-700">Export Format</Label>
                  <Select value={design.exportFormat} onValueChange={(value) => updateDesign('exportFormat', value)}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="jpg">JPG</SelectItem>
                      <SelectItem value="svg">SVG</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700">Export Quality</Label>
                  <Input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={design.exportQuality}
                    onChange={(e) => updateDesign('exportQuality', parseFloat(e.target.value))}
                    className="mt-1"
                  />
                  <div className="text-xs text-gray-500 mt-1">{Math.round(design.exportQuality * 100)}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}