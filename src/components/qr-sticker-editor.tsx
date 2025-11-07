'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Copy, Check, FileImage, FileText, File, Palette, Square, Circle, Hexagon, Star, Heart, Settings, Type, Image as ImageIcon, RotateCcw, Save, Move, RotateCw, ZoomIn, ZoomOut, Trash2, Layers, Lock, Unlock, Upload, Wand2, Eraser, Grid3x3, Ruler, Maximize2, Minimize2, FolderOpen, Filter, X, Search, BookOpen } from "lucide-react"
import jsPDF from 'jspdf'
import * as fabric from 'fabric'
import { removeBackground, processImage } from '@/services/image-processing'

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

interface StickerTemplate {
  id: string
  name: string
  description?: string
  design: StickerDesign
  shape: 'square' | 'circle' | 'rectangle-landscape' | 'rectangle-portrait'
  size: '15x15mm' | '20x20mm' | '25x25mm' | '45x45mm'
  category: 'item' | 'pet' | 'emergency'
  isLocked: boolean
  createdAt: string
  updatedAt: string
  preview?: string // Base64 preview image
}

// Size presets in mm to pixels (at 300 DPI)
const SIZE_PRESETS = {
  '15x15mm': { width: 177, height: 177 }, // 15mm * 300 DPI / 25.4mm per inch
  '20x20mm': { width: 236, height: 236 },
  '25x25mm': { width: 295, height: 295 },
  '45x45mm': { width: 531, height: 531 },
}

// Convert mm to pixels at 300 DPI
const mmToPixels = (mm: number, dpi: number = 300): number => {
  return Math.round((mm / 25.4) * dpi)
}

const STORAGE_KEY = 'qr-sticker-templates'

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
    borderWidth: 0,
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
  const [processedQRUrl, setProcessedQRUrl] = useState<string>(qrCodeUrl)
  const [isProcessingBackground, setIsProcessingBackground] = useState(false)
  const [qrCodeObject, setQRCodeObject] = useState<fabric.Image | null>(null)
  const [taglineTextObject, setTaglineTextObject] = useState<fabric.Text | null>(null)
  const [backgroundShapeObject, setBackgroundShapeObject] = useState<fabric.Object | null>(null)
  const [clipboardObject, setClipboardObject] = useState<fabric.Object | null>(null)
  const [showGrid, setShowGrid] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [showRulers, setShowRulers] = useState(false)
  
  // Template management
  const [templates, setTemplates] = useState<StickerTemplate[]>([])
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<StickerTemplate | null>(null)
  const [isTemplateLocked, setIsTemplateLocked] = useState(false)
  const [templateFilters, setTemplateFilters] = useState<{
    shape?: 'square' | 'circle' | 'rectangle-landscape' | 'rectangle-portrait'
    size?: '15x15mm' | '20x20mm' | '25x25mm' | '45x45mm'
    category?: 'item' | 'pet' | 'emergency'
  }>({})
  const [templateSearch, setTemplateSearch] = useState('')
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false)
  const [saveTemplateData, setSaveTemplateData] = useState<{
    name: string
    description: string
    shape: 'square' | 'circle' | 'rectangle-landscape' | 'rectangle-portrait'
    size: '15x15mm' | '20x20mm' | '25x25mm' | '45x45mm'
    category: 'item' | 'pet' | 'emergency'
  }>({
    name: '',
    description: '',
    shape: 'square',
    size: '25x25mm',
    category: 'item'
  })

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: design.width,
      height: design.height,
      backgroundColor: 'transparent', // Transparent background
      selection: true,
      preserveObjectStacking: true,
      renderOnAddRemove: true,
      stateful: true,
    })

    fabricCanvasRef.current = canvas

    // Remove any default borders or styling from canvas element
    if (canvasRef.current) {
      canvasRef.current.style.border = 'none'
      canvasRef.current.style.outline = 'none'
      canvasRef.current.style.boxShadow = 'none'
      canvasRef.current.setAttribute('style', canvasRef.current.getAttribute('style') + ' border: none !important; outline: none !important;')
    }

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
      // Update selected object state when object is modified
      const activeObj = canvas.getActiveObject()
      if (activeObj) {
        setSelectedObject(activeObj)
      }
    })

    canvas.on('object:moving', () => {
      const activeObj = canvas.getActiveObject()
      if (activeObj) {
        setSelectedObject(activeObj)
      }
    })

    canvas.on('object:scaling', () => {
      const activeObj = canvas.getActiveObject()
      if (activeObj) {
        setSelectedObject(activeObj)
      }
    })

    canvas.on('object:rotating', () => {
      const activeObj = canvas.getActiveObject()
      if (activeObj) {
        setSelectedObject(activeObj)
      }
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

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input field
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        (target.closest('[role="combobox"]') !== null)
      ) {
        return
      }

      const canvas = fabricCanvasRef.current
      const activeObject = canvas?.getActiveObject()

      // Delete or Backspace - Delete selected object
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeObject && canvas) {
        e.preventDefault()
        e.stopPropagation()
        canvas.remove(activeObject)
        canvas.discardActiveObject()
        canvas.renderAll()
        setSelectedObject(null)
        setCanvasObjects(canvas.getObjects())
        return
      }

      // Ctrl/Cmd + D - Duplicate selected object
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && activeObject && canvas) {
        e.preventDefault()
        e.stopPropagation()
        activeObject.clone().then((cloned: any) => {
          cloned.set({
            left: (activeObject.left || 0) + 20,
            top: (activeObject.top || 0) + 20,
          })
          canvas.add(cloned)
          canvas.setActiveObject(cloned)
          canvas.renderAll()
          setSelectedObject(cloned)
          setCanvasObjects(canvas.getObjects())
        })
        return
      }

      // Ctrl/Cmd + C - Copy object to clipboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && activeObject && canvas) {
        e.preventDefault()
        e.stopPropagation()
        // Store object reference for pasting
        setClipboardObject(activeObject)
        return
      }

      // Ctrl/Cmd + V - Paste from clipboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && canvas) {
        e.preventDefault()
        e.stopPropagation()
        const objToPaste = clipboardObject || activeObject
        if (objToPaste) {
          objToPaste.clone().then((cloned: any) => {
            cloned.set({
              left: (objToPaste.left || 0) + 20,
              top: (objToPaste.top || 0) + 20,
            })
            canvas.add(cloned)
            canvas.setActiveObject(cloned)
            canvas.renderAll()
            setSelectedObject(cloned)
            setCanvasObjects(canvas.getObjects())
          })
        }
        return
      }

      // Ctrl/Cmd + A - Select all objects
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && canvas) {
        e.preventDefault()
        e.stopPropagation()
        const objects = canvas.getObjects().filter((obj: any) => obj.selectable !== false)
        if (objects.length > 0) {
          const selection = new fabric.ActiveSelection(objects, {
            canvas: canvas,
          })
          canvas.setActiveObject(selection)
          canvas.renderAll()
          setSelectedObject(selection)
        }
        return
      }

      // Arrow keys - Move selected object
      if (activeObject && canvas) {
        const step = e.shiftKey ? 10 : 1 // Shift + Arrow = move 10px, Arrow = move 1px
        let moved = false

        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault()
            e.stopPropagation()
            activeObject.set('top', (activeObject.top || 0) - step)
            activeObject.setCoords()
            moved = true
            break
          case 'ArrowDown':
            e.preventDefault()
            e.stopPropagation()
            activeObject.set('top', (activeObject.top || 0) + step)
            activeObject.setCoords()
            moved = true
            break
          case 'ArrowLeft':
            e.preventDefault()
            e.stopPropagation()
            activeObject.set('left', (activeObject.left || 0) - step)
            activeObject.setCoords()
            moved = true
            break
          case 'ArrowRight':
            e.preventDefault()
            e.stopPropagation()
            activeObject.set('left', (activeObject.left || 0) + step)
            activeObject.setCoords()
            moved = true
            break
        }

        if (moved) {
          canvas.renderAll()
          return
        }
      }

      // Escape - Deselect object
      if (e.key === 'Escape' && canvas) {
        e.preventDefault()
        e.stopPropagation()
        canvas.discardActiveObject()
        canvas.renderAll()
        setSelectedObject(null)
        return
      }
    }

    // Add event listener with capture to catch events early
    window.addEventListener('keydown', handleKeyDown, true)

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [clipboardObject]) // Include clipboardObject in dependencies

  // Disable canvas interactions when template is locked
  useEffect(() => {
    if (fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current
      if (isTemplateLocked) {
        // Disable selection and editing
        canvas.selection = false
        canvas.getObjects().forEach((obj: any) => {
          obj.set({
            selectable: false,
            evented: false
          })
        })
        canvas.renderAll()
      } else {
        // Re-enable selection
        canvas.selection = true
        canvas.getObjects().forEach((obj: any) => {
          // Don't re-enable background shape
          if (obj !== backgroundShapeObject && obj.excludeFromExport !== true) {
            obj.set({
              selectable: true,
              evented: true
            })
          }
        })
        canvas.renderAll()
      }
    }
  }, [isTemplateLocked])

  // Update canvas when design changes (but not on initial load to prevent duplicates)
  useEffect(() => {
    if (fabricCanvasRef.current && isInitialized && !isTemplateLocked) {
      // Update background shape if it exists
      if (backgroundShapeObject) {
        updateBackgroundShape()
      } else {
        loadDesignToCanvas()
      }
    }
  }, [design.shape, design.width, design.height, design.backgroundColor, design.borderWidth, design.borderColor, design.borderStyle, design.borderRadius, design.backgroundOpacity, design.shadow, design.shadowColor, design.shadowBlur, design.shadowOffset])

  // Update tagline text when design changes
  useEffect(() => {
    if (fabricCanvasRef.current && isInitialized && taglineTextObject) {
      updateTaglineText()
    } else if (fabricCanvasRef.current && isInitialized && design.tagline && design.tagline.trim() && !taglineTextObject) {
      addTaglineText()
    } else if (fabricCanvasRef.current && isInitialized && (!design.tagline || !design.tagline.trim()) && taglineTextObject) {
      fabricCanvasRef.current.remove(taglineTextObject)
      setTaglineTextObject(null)
      fabricCanvasRef.current.renderAll()
    }
  }, [design.tagline, design.taglineFont, design.taglineSize, design.taglineColor, design.taglinePosition, design.taglineAlign])

  // Update QR code position and size
  useEffect(() => {
    if (fabricCanvasRef.current && isInitialized && qrCodeObject) {
      updateQRCode()
    }
  }, [design.qrSize, design.qrPosition])

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
    } else {
      shapeObject.set('shadow', null)
    }

    // Make background non-selectable and send to back
    // Add a custom property to identify this as the background shape
    shapeObject.set({
      selectable: false,
      evented: false,
      excludeFromExport: true, // Custom property to identify background
    })

    canvas.add(shapeObject)
    canvas.sendObjectToBack(shapeObject)
    setBackgroundShapeObject(shapeObject)
    
    // Set the background shape as the canvas background for export
    canvas.backgroundImage = shapeObject
    canvas.renderAll()
  }

  const updateBackgroundShape = () => {
    if (!fabricCanvasRef.current || !backgroundShapeObject) return

    const canvas = fabricCanvasRef.current
    
    // Remove old background
    canvas.remove(backgroundShapeObject)
    
    // Create new background with updated properties
    // The createBackgroundShape function will set the excludeFromExport property
    createBackgroundShape()
  }

  const addQRCode = async () => {
    if (!fabricCanvasRef.current || !processedQRUrl) return

    const canvas = fabricCanvasRef.current

    try {
      // Remove existing QR code if present
      if (qrCodeObject) {
        canvas.remove(qrCodeObject)
      }

      // Load QR code image
      fabric.Image.fromURL(processedQRUrl).then((img: any) => {
        // Get actual image dimensions
        const imgWidth = img.width || 200
        const imgHeight = img.height || 200
        
        img.set({
          left: design.qrPosition.x,
          top: design.qrPosition.y,
          scaleX: design.qrSize / imgWidth,
          scaleY: design.qrSize / imgHeight,
          selectable: true,
          cornerStyle: 'circle',
          cornerColor: '#007bff',
          cornerSize: 8,
          transparentCorners: false,
          lockMovementX: false,
          lockMovementY: false,
          lockRotation: false,
          lockScalingX: false,
          lockScalingY: false,
        })
        
        // Store reference to QR code object
        setQRCodeObject(img)
        
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.renderAll()
        setCanvasObjects(canvas.getObjects())
      })
    } catch (error) {
      console.error('Failed to load QR code image:', error)
    }
  }

  const updateQRCode = () => {
    if (!fabricCanvasRef.current || !qrCodeObject) return

    const canvas = fabricCanvasRef.current
    
    // Get original image dimensions
    const imgWidth = (qrCodeObject.width || 200) / (qrCodeObject.scaleX || 1)
    const imgHeight = (qrCodeObject.height || 200) / (qrCodeObject.scaleY || 1)

    qrCodeObject.set({
      left: design.qrPosition.x,
      top: design.qrPosition.y,
      scaleX: design.qrSize / imgWidth,
      scaleY: design.qrSize / imgHeight,
    })
    qrCodeObject.setCoords()
    canvas.renderAll()
  }

  // Remove background from QR code
  const handleRemoveQRBackground = async () => {
    if (!fabricCanvasRef.current || !qrCodeUrl) return

    setIsProcessingBackground(true)
    try {
      const result = await removeBackground(qrCodeUrl)
      setProcessedQRUrl(result.src)
      
      // Reload QR code with new processed image
      await addQRCode()
      
      alert('QR code background removed successfully!')
    } catch (error) {
      console.error('Failed to remove background:', error)
      alert('Failed to remove background. Please try again.')
    } finally {
      setIsProcessingBackground(false)
    }
  }

  // Upload and add custom image
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !fabricCanvasRef.current) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      if (imageUrl) {
        fabric.Image.fromURL(imageUrl).then((img: any) => {
          img.set({
            left: design.width / 2,
            top: design.height / 2,
            originX: 'center',
            originY: 'center',
            scaleX: 0.5,
            scaleY: 0.5,
            selectable: true,
            cornerStyle: 'circle',
            cornerColor: '#ff6b35',
            cornerSize: 8,
            transparentCorners: false,
          })
          const canvas = fabricCanvasRef.current
          if (canvas) {
            canvas.add(img)
            canvas.setActiveObject(img)
            setSelectedObject(img)
            canvas.renderAll()
            setCanvasObjects(canvas.getObjects())
          }
        }).catch((error) => {
          console.error('Failed to load uploaded image:', error)
          alert('Failed to load image. Please try again.')
        })
      }
    }
    reader.readAsDataURL(file)
    
    // Reset input
    event.target.value = ''
  }

  const addTaglineText = () => {
    if (!fabricCanvasRef.current || !design.tagline || !design.tagline.trim()) return

    const canvas = fabricCanvasRef.current

    // Remove existing tagline if present
    if (taglineTextObject) {
      canvas.remove(taglineTextObject)
    }

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
    setTaglineTextObject(text)
    canvas.renderAll()
  }

  const updateTaglineText = () => {
    if (!fabricCanvasRef.current || !taglineTextObject || !design.tagline) return

    taglineTextObject.set({
      text: design.tagline,
      fontFamily: design.taglineFont,
      fontSize: design.taglineSize,
      fill: design.taglineColor,
      textAlign: design.taglineAlign,
      left: design.taglinePosition.x,
      top: design.taglinePosition.y,
    })
    taglineTextObject.setCoords()
    fabricCanvasRef.current.renderAll()
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
    canvas.discardActiveObject()
    canvas.renderAll()
    setSelectedObject(null)
    setCanvasObjects(canvas.getObjects())
  }

  const bringToFront = () => {
    if (!fabricCanvasRef.current || !selectedObject) return

    const canvas = fabricCanvasRef.current
    canvas.bringObjectToFront(selectedObject)
    canvas.renderAll()
    setCanvasObjects(canvas.getObjects())
  }

  const sendToBack = () => {
    if (!fabricCanvasRef.current || !selectedObject) return

    const canvas = fabricCanvasRef.current
    // Don't send to back if it's the background shape
    if (selectedObject === backgroundShapeObject) {
      return
    }
    
    // Get all objects
    const objects = canvas.getObjects()
    
    // Find the background shape index
    const backgroundIndex = backgroundShapeObject ? objects.indexOf(backgroundShapeObject) : -1
    
      if (backgroundIndex >= 0) {
      // Move selected object to be right after the background (index backgroundIndex + 1)
      // This ensures it's visible but behind all other objects
      const currentIndex = objects.indexOf(selectedObject)
      if (currentIndex > backgroundIndex + 1) {
        // Use sendObjectBackwards repeatedly until we reach the position right after background
        // This is the safest way to maintain canvas state
        let iterations = 0
        const maxIterations = objects.length // Safety limit
        while (iterations < maxIterations) {
          const objIndex = canvas.getObjects().indexOf(selectedObject)
          if (objIndex <= backgroundIndex + 1) {
            break
          }
          canvas.sendObjectBackwards(selectedObject)
          iterations++
        }
      }
    } else {
      // If no background, just send to back normally
      canvas.sendObjectToBack(selectedObject)
    }
    
    canvas.renderAll()
    setCanvasObjects(canvas.getObjects())
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
      setSelectedObject(cloned)
      canvas.renderAll()
      setCanvasObjects(canvas.getObjects())
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
    setQRCodeObject(null)
    setTaglineTextObject(null)
    setBackgroundShapeObject(null)
    setIsInitialized(false)
    // Reload design after clearing
    setTimeout(() => {
      loadDesignToCanvas()
      setIsInitialized(true)
    }, 100)
  }

  // Add custom text
  const addText = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    // Use IText for editable text that can be edited by clicking on it
    const text = new fabric.IText('New Text', {
      left: design.width / 2,
      top: design.height / 2,
      originX: 'center',
      originY: 'center',
      fontFamily: 'Arial',
      fontSize: 20,
      fill: '#000000',
      selectable: true,
      cornerStyle: 'circle',
      cornerColor: '#28a745',
      cornerSize: 8,
      transparentCorners: false,
      editable: true,
    })

    // Add event listener to update when text is edited
    text.on('editing:entered', () => {
      setSelectedObject(text)
    })

    text.on('editing:exited', () => {
      canvas.renderAll()
      setCanvasObjects(canvas.getObjects())
    })

    canvas.add(text)
    canvas.setActiveObject(text)
    setSelectedObject(text)
    canvas.renderAll()
    setCanvasObjects(canvas.getObjects())
  }

  // Add rectangle
  const addRectangle = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const rect = new fabric.Rect({
      width: 100,
      height: 60,
      left: design.width / 2 - 50,
      top: design.height / 2 - 30,
      originX: 'center',
      originY: 'center',
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
    setSelectedObject(rect)
    canvas.renderAll()
    setCanvasObjects(canvas.getObjects())
  }

  // Add circle
  const addCircle = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const circle = new fabric.Circle({
      radius: 50,
      left: design.width / 2,
      top: design.height / 2,
      originX: 'center',
      originY: 'center',
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
    setSelectedObject(circle)
    canvas.renderAll()
    setCanvasObjects(canvas.getObjects())
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
      setSelectedObject(img)
      canvas.renderAll()
      setCanvasObjects(canvas.getObjects())
    }).catch((error) => {
      alert('Failed to load image: ' + error.message)
    })
  }

  // Add triangle
  const addTriangle = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const triangle = new fabric.Triangle({
      width: 80,
      height: 80,
      left: design.width / 2,
      top: design.height / 2,
      originX: 'center',
      originY: 'center',
      fill: '#ff6b35',
      stroke: '#000000',
      strokeWidth: 2,
      selectable: true,
      cornerStyle: 'circle',
      cornerColor: '#ff6b35',
      cornerSize: 8,
      transparentCorners: false,
    })

    canvas.add(triangle)
    canvas.setActiveObject(triangle)
    setSelectedObject(triangle)
    canvas.renderAll()
    setCanvasObjects(canvas.getObjects())
  }

  // Add polygon
  const addPolygon = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const points = [
      { x: 0, y: 50 },
      { x: 50, y: 0 },
      { x: 100, y: 50 },
      { x: 75, y: 100 },
      { x: 25, y: 100 },
    ]
    const polygon = new fabric.Polygon(points, {
      left: design.width / 2,
      top: design.height / 2,
      originX: 'center',
      originY: 'center',
      fill: '#9b59b6',
      stroke: '#000000',
      strokeWidth: 2,
      selectable: true,
      cornerStyle: 'circle',
      cornerColor: '#9b59b6',
      cornerSize: 8,
      transparentCorners: false,
    })

    canvas.add(polygon)
    canvas.setActiveObject(polygon)
    setSelectedObject(polygon)
    canvas.renderAll()
    setCanvasObjects(canvas.getObjects())
  }

  // Update QR code when processed URL changes
  useEffect(() => {
    if (isInitialized && processedQRUrl !== qrCodeUrl) {
      addQRCode()
    }
  }, [processedQRUrl])

  // Add line
  const addLine = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const centerX = design.width / 2
    const centerY = design.height / 2
    const line = new fabric.Line([centerX - 75, centerY - 75, centerX + 75, centerY + 75], {
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
    setSelectedObject(line)
    canvas.renderAll()
    setCanvasObjects(canvas.getObjects())
  }

  // Add arrow
  const addArrow = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const centerX = design.width / 2
    const centerY = design.height / 2
    const arrow = new fabric.Line([centerX - 75, centerY - 75, centerX + 75, centerY + 75], {
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
      left: centerX + 75,
      top: centerY + 75,
      originX: 'center',
      originY: 'center',
      angle: 45,
      fill: '#000000',
      selectable: false,
      evented: false,
    })

    canvas.add(arrow)
    canvas.add(arrowhead)
    canvas.setActiveObject(arrow)
    setSelectedObject(arrow)
    canvas.renderAll()
    setCanvasObjects(canvas.getObjects())
  }

  // Add star
  const addStar = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const star = new fabric.Polygon(createStarPoints(0, 0, 50), {
      fill: '#ffd700',
      stroke: '#000000',
      strokeWidth: 2,
      left: design.width / 2,
      top: design.height / 2,
      originX: 'center',
      originY: 'center',
      selectable: true,
      cornerStyle: 'circle',
      cornerColor: '#ffd700',
      cornerSize: 8,
      transparentCorners: false,
    })

    canvas.add(star)
    canvas.setActiveObject(star)
    setSelectedObject(star)
    canvas.renderAll()
    setCanvasObjects(canvas.getObjects())
  }

  // Add heart
  const addHeart = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const heart = new fabric.Polygon(createHeartPoints(0, 0, 50), {
      fill: '#ff69b4',
      stroke: '#000000',
      strokeWidth: 2,
      left: design.width / 2,
      top: design.height / 2,
      originX: 'center',
      originY: 'center',
      selectable: true,
      cornerStyle: 'circle',
      cornerColor: '#ff69b4',
      cornerSize: 8,
      transparentCorners: false,
    })

    canvas.add(heart)
    canvas.setActiveObject(heart)
    setSelectedObject(heart)
    canvas.renderAll()
    setCanvasObjects(canvas.getObjects())
  }

  const exportSticker = async () => {
    if (!fabricCanvasRef.current) return

    setIsGenerating(true)
    
    try {
      const canvas = fabricCanvasRef.current
      
      // Create a new Fabric canvas for export (only the design content, no UI)
      // Use a temporary canvas element with transparent background
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = design.width
      tempCanvas.height = design.height
      
      const exportCanvas = new fabric.Canvas(tempCanvas, {
        width: design.width,
        height: design.height,
      })
      
      // Explicitly set canvas background to transparent (no background)
      // Use type assertion to allow undefined for transparency
      ;(exportCanvas as any).backgroundColor = undefined
      exportCanvas.renderOnAddRemove = false
      
      // Get all objects from the main canvas (only the design elements)
      // EXCLUDE the background shape - it's just the white canvas for editing
      // Filter by both object reference and the excludeFromExport property
      const objects = canvas.getObjects().filter((obj: any) => {
        // Exclude if it's the background shape object (by reference)
        if (obj === backgroundShapeObject) return false
        // Exclude if it has the excludeFromExport flag (custom property)
        if (obj.excludeFromExport === true) return false
        // Include all other objects
        return true
      })
      
      // Clone and add all objects to export canvas (excluding background)
      const clonePromises = objects.map((obj) => 
        obj.clone().then((cloned: any) => {
          exportCanvas.add(cloned)
          return cloned
        })
      )
      
      await Promise.all(clonePromises)
      
      // Render the export canvas
      exportCanvas.renderAll()
      
      // Get the data URL from the export canvas (only the design, no workspace)
      const multiplier = design.exportDpi / 72 // Higher DPI for better quality
      
      if (design.exportFormat === 'pdf') {
        // Use jsPDF for PDF export
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        })
        
        // For PDF, export as PNG with transparency
        const imgData = exportCanvas.toDataURL({ 
          format: 'png', 
          multiplier: multiplier,
          quality: 1.0,
          enableRetinaScaling: true
        })
        const imgWidth = 210 // A4 width in mm
        const imgHeight = (exportCanvas.height! * imgWidth) / exportCanvas.width!
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
        pdf.save(`qr-sticker-${qrCode}.pdf`)
      } else if (design.exportFormat === 'png') {
        // PNG supports transparency - export with transparent background
        const dataUrl = exportCanvas.toDataURL({ 
          format: 'png', 
          multiplier: multiplier,
          quality: 1.0,
          enableRetinaScaling: true
        })
        
        const link = document.createElement('a')
        link.download = `qr-sticker-${qrCode}.png`
        link.href = dataUrl
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else if (design.exportFormat === 'svg') {
        // SVG supports transparency
        const svgData = exportCanvas.toSVG({
          width: String(design.width),
          height: String(design.height),
        })
        
        const blob = new Blob([svgData], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `qr-sticker-${qrCode}.svg`
        link.href = url
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        // JPG doesn't support transparency - add white background for JPG
        const format = 'jpeg'
        // Create a white background for JPG since it doesn't support transparency
        const whiteBg = new fabric.Rect({
          width: design.width,
          height: design.height,
          left: 0,
          top: 0,
          fill: '#ffffff',
          selectable: false,
          evented: false,
        })
        exportCanvas.add(whiteBg)
        exportCanvas.sendObjectToBack(whiteBg)
        exportCanvas.renderAll()
        
        const dataUrl = exportCanvas.toDataURL({ 
          format: format as any, 
          multiplier: multiplier,
          quality: design.exportQuality,
          enableRetinaScaling: true
        })
        
        const link = document.createElement('a')
        link.download = `qr-sticker-${qrCode}.jpg`
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
      borderWidth: 0,
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
    // Don't allow updates if template is locked
    if (isTemplateLocked) {
      alert('This template is locked and cannot be modified. Please create a new template or unlock it first.')
      return
    }
    
    setDesign(prev => {
      // Handle nested properties like shadowOffset.x
      if (key.includes('.')) {
        const [parentKey, childKey] = key.split('.')
        const parentValue = prev[parentKey as keyof StickerDesign]
        if (typeof parentValue === 'object' && parentValue !== null) {
          return {
            ...prev,
            [parentKey]: {
              ...(parentValue as any),
              [childKey]: value
            }
          }
        }
        return prev
      }
      return {
        ...prev,
        [key]: value
      }
    })
  }

  // Template Management Functions
  const loadTemplates = (): StickerTemplate[] => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load templates:', error)
      return []
    }
  }

  const saveTemplates = (templatesToSave: StickerTemplate[]) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templatesToSave))
      setTemplates(templatesToSave)
    } catch (error) {
      console.error('Failed to save templates:', error)
      alert('Failed to save template. Please try again.')
    }
  }

  const generatePreview = async (): Promise<string> => {
    if (!fabricCanvasRef.current) return ''
    
    const canvas = fabricCanvasRef.current
    const dataUrl = canvas.toDataURL({ 
      format: 'png', 
      multiplier: 0.5, // Smaller preview
      quality: 0.8
    })
    return dataUrl
  }

  const saveAsTemplate = async (
    name: string,
    description: string,
    shape: 'square' | 'circle' | 'rectangle-landscape' | 'rectangle-portrait',
    size: '15x15mm' | '20x20mm' | '25x25mm' | '45x45mm',
    category: 'item' | 'pet' | 'emergency',
    isLocked: boolean = true
  ) => {
    if (!name.trim()) {
      alert('Please enter a template name')
      return
    }

    const preview = await generatePreview()
    const newTemplate: StickerTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description.trim() || undefined,
      design: { ...design },
      shape,
      size,
      category,
      isLocked,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preview
    }

    const existingTemplates = loadTemplates()
    existingTemplates.push(newTemplate)
    saveTemplates(existingTemplates)
    
    alert(`Template "${name}" saved successfully!`)
    setShowTemplateLibrary(true)
  }

  const loadTemplate = async (template: StickerTemplate) => {
    if (template.isLocked) {
      setIsTemplateLocked(true)
      setCurrentTemplate(template)
    } else {
      setIsTemplateLocked(false)
      setCurrentTemplate(null)
    }
    
    setDesign(template.design)
    
    // Reload canvas with new design
    if (fabricCanvasRef.current) {
      setIsInitialized(false)
      setTimeout(() => {
        loadDesignToCanvas()
        setIsInitialized(true)
      }, 100)
    }
  }

  const deleteTemplate = (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    
    const existingTemplates = loadTemplates()
    const filtered = existingTemplates.filter(t => t.id !== templateId)
    saveTemplates(filtered)
    
    if (currentTemplate?.id === templateId) {
      setIsTemplateLocked(false)
      setCurrentTemplate(null)
    }
  }

  const unlockTemplate = () => {
    setIsTemplateLocked(false)
    setCurrentTemplate(null)
  }

  const applySizePreset = (size: '15x15mm' | '20x20mm' | '25x25mm' | '45x45mm') => {
    if (isTemplateLocked) {
      alert('Cannot change size on a locked template')
      return
    }
    
    const preset = SIZE_PRESETS[size]
    setDesign(prev => ({
      ...prev,
      width: preset.width,
      height: preset.height
    }))
  }

  // Load templates on mount
  useEffect(() => {
    setTemplates(loadTemplates())
  }, [])

  // Zoom controls
  const handleZoomIn = () => {
    if (zoomLevel < 200) {
      setZoomLevel(prev => Math.min(prev + 10, 200))
    }
  }

  const handleZoomOut = () => {
    if (zoomLevel > 25) {
      setZoomLevel(prev => Math.max(prev - 10, 25))
    }
  }

  const handleZoomReset = () => {
    setZoomLevel(100)
  }

  // Update canvas zoom
  useEffect(() => {
    if (fabricCanvasRef.current) {
      const scale = zoomLevel / 100
      const canvas = fabricCanvasRef.current
      canvas.setZoom(scale)
      canvas.renderAll()
    }
  }, [zoomLevel])

  // Ensure canvas has no border after render
  useEffect(() => {
    if (canvasRef.current) {
      const canvasEl = canvasRef.current
      canvasEl.style.border = 'none'
      canvasEl.style.outline = 'none'
      canvasEl.style.boxShadow = 'none'
      
      // Force remove any border classes
      canvasEl.classList.remove('border', 'border-gray-200', 'border-gray-300')
    }
  }, [isInitialized, zoomLevel])

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top Toolbar - Professional Design */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/80 shadow-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">QR Sticker Editor</h1>
              <p className="text-xs text-gray-500">Professional Design Studio</p>
            </div>
          </div>
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowTemplateLibrary(true)} 
              className="border-gray-300 hover:bg-gray-50"
            >
              <BookOpen className="h-4 w-4 mr-1.5" />
              Templates
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowSaveTemplateDialog(true)} 
              className="border-gray-300 hover:bg-gray-50"
              disabled={isTemplateLocked}
            >
              <Save className="h-4 w-4 mr-1.5" />
              Save Template
            </Button>
            {isTemplateLocked && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={unlockTemplate} 
                className="border-orange-300 hover:bg-orange-50 text-orange-700"
              >
                <Unlock className="h-4 w-4 mr-1.5" />
                Unlock
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={resetDesign} className="border-gray-300 hover:bg-gray-50" disabled={isTemplateLocked}>
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
            <Button size="sm" onClick={exportSticker} disabled={isGenerating} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md">
              <Download className="h-4 w-4 mr-1.5" />
              {isGenerating ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 text-xs text-gray-600">
            <span className="px-2 py-1 bg-gray-100 rounded">Code: {qrCode}</span>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            {design.width} × {design.height}px
          </div>
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Left Sidebar - Add Elements */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Add Elements</h3>
            <div className="space-y-2">
              <Button variant="outline" size="sm" onClick={addText} className="w-full justify-start" disabled={isTemplateLocked}>
                <Type className="h-4 w-4 mr-2" />
                Text
              </Button>
              <Button variant="outline" size="sm" onClick={addRectangle} className="w-full justify-start" disabled={isTemplateLocked}>
                <Square className="h-4 w-4 mr-2" />
                Rectangle
              </Button>
              <Button variant="outline" size="sm" onClick={addCircle} className="w-full justify-start" disabled={isTemplateLocked}>
                <Circle className="h-4 w-4 mr-2" />
                Circle
              </Button>
              <Button variant="outline" size="sm" onClick={addTriangle} className="w-full justify-start" disabled={isTemplateLocked}>
                <Hexagon className="h-4 w-4 mr-2" />
                Triangle
              </Button>
              <Button variant="outline" size="sm" onClick={addPolygon} className="w-full justify-start" disabled={isTemplateLocked}>
                <Hexagon className="h-4 w-4 mr-2" />
                Polygon
              </Button>
              <Button variant="outline" size="sm" onClick={addLine} className="w-full justify-start" disabled={isTemplateLocked}>
                <Move className="h-4 w-4 mr-2" />
                Line
              </Button>
              <Button variant="outline" size="sm" onClick={addArrow} className="w-full justify-start" disabled={isTemplateLocked}>
                <Move className="h-4 w-4 mr-2" />
                Arrow
              </Button>
              <Button variant="outline" size="sm" onClick={addStar} className="w-full justify-start" disabled={isTemplateLocked}>
                <Star className="h-4 w-4 mr-2" />
                Star
              </Button>
              <Button variant="outline" size="sm" onClick={addHeart} className="w-full justify-start" disabled={isTemplateLocked}>
                <Heart className="h-4 w-4 mr-2" />
                Heart
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="image-upload"
                  disabled={isTemplateLocked}
                />
                <Button variant="outline" size="sm" className="w-full justify-start" asChild disabled={isTemplateLocked}>
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </label>
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={addImageFromURL} className="w-full justify-start" disabled={isTemplateLocked}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Image from URL
              </Button>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">QR Code Tools</h3>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRemoveQRBackground} 
                  disabled={isProcessingBackground}
                  className="w-full justify-start"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  {isProcessingBackground ? 'Processing...' : 'Remove QR Background'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addQRCode} 
                  className="w-full justify-start"
                >
                  <FileImage className="h-4 w-4 mr-2" />
                  Reload QR Code
                </Button>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Canvas Tools</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" onClick={deleteSelected} disabled={!selectedObject || isTemplateLocked} className="w-full justify-start">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={duplicateSelected} disabled={!selectedObject || isTemplateLocked} className="w-full justify-start">
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" onClick={bringToFront} disabled={!selectedObject || isTemplateLocked} className="w-full justify-start">
                  <Layers className="h-4 w-4 mr-2" />
                  Bring to Front
                </Button>
                <Button variant="outline" size="sm" onClick={sendToBack} disabled={!selectedObject || isTemplateLocked} className="w-full justify-start">
                  <Layers className="h-4 w-4 mr-2" />
                  Send to Back
                </Button>
                <Button variant="outline" size="sm" onClick={lockSelected} disabled={!selectedObject || isTemplateLocked} className="w-full justify-start">
                  <Lock className="h-4 w-4 mr-2" />
                  Lock
                </Button>
                <Button variant="outline" size="sm" onClick={unlockAll} disabled={isTemplateLocked} className="w-full justify-start">
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock All
                </Button>
                <Button variant="destructive" size="sm" onClick={clearCanvas} disabled={isTemplateLocked} className="w-full justify-start">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Canvas
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Center Canvas - Professional Workspace */}
        <div className="flex-1 flex items-center justify-center relative overflow-auto min-w-0" 
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, #e5e7eb 0px, #e5e7eb 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, #e5e7eb 0px, #e5e7eb 1px, transparent 1px, transparent 20px)',
            backgroundSize: '20px 20px',
            backgroundColor: '#f9fafb'
          }}>
          {/* Checkerboard pattern overlay for transparency visualization */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
                linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
                linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
              `,
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              opacity: 0.3
            }}
          />
          
          {/* Grid overlay */}
          {showGrid && (
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            />
          )}

          {/* Canvas Container with Professional Styling */}
          <div className="relative z-10 my-12">
            {/* Canvas Controls Toolbar */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-2 mb-2 z-20">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 px-3 py-2 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 25}
                  className="h-7 w-7 p-0"
                >
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-xs font-medium text-gray-700 min-w-[3rem] text-center">
                    {zoomLevel}%
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 200}
                  className="h-7 w-7 p-0"
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
                <div className="w-px h-4 bg-gray-300 mx-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomReset}
                  className="h-7 px-2 text-xs"
                >
                  Reset
                </Button>
                <div className="w-px h-4 bg-gray-300 mx-1" />
                <Button
                  variant={showGrid ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                  className="h-7 w-7 p-0"
                  title="Toggle Grid"
                >
                  <Grid3x3 className="h-3 w-3" />
                </Button>
                <Button
                  variant={showRulers ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowRulers(!showRulers)}
                  className="h-7 w-7 p-0"
                  title="Toggle Rulers"
                >
                  <Ruler className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Canvas with Professional Shadow and Border */}
            <div className="relative">
              {/* Rulers */}
              {showRulers && (
                <>
                  {/* Horizontal Ruler */}
                  <div className="absolute -top-8 left-8 right-8 h-8 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200 flex items-end px-2 overflow-hidden">
                    {Array.from({ length: Math.ceil(design.width / 50) }).map((_, i) => (
                      <div key={i} className="flex flex-col items-center" style={{ width: `${50 / design.width * 100}%` }}>
                        <div className="w-px h-3 bg-gray-400" />
                        <span className="text-[9px] text-gray-600 font-medium mt-0.5">{i * 50}</span>
                      </div>
                    ))}
                  </div>
                  {/* Vertical Ruler */}
                  <div className="absolute -left-8 top-8 bottom-8 w-8 bg-gradient-to-r from-gray-50 to-white border-r border-gray-200 flex flex-col items-end py-2 overflow-hidden">
                    {Array.from({ length: Math.ceil(design.height / 50) }).map((_, i) => (
                      <div key={i} className="flex items-center" style={{ height: `${50 / design.height * 100}%` }}>
                        <div className="h-px w-3 bg-gray-400" />
                        <span className="text-[9px] text-gray-600 font-medium ml-0.5">{i * 50}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div 
                className="inline-block"
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease-in-out',
                  marginLeft: showRulers ? '2rem' : '0',
                  marginTop: showRulers ? '2rem' : '0',
                  padding: '0'
                }}
              >
                <canvas
                  ref={canvasRef}
                  style={{ 
                    width: `${design.width}px`,
                    height: `${design.height}px`,
                    display: 'block',
                    backgroundColor: 'transparent',
                    border: 'none !important',
                    outline: 'none !important',
                    boxShadow: 'none !important',
                    margin: '0',
                    padding: '0'
                  }}
                />
              </div>
            </div>
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
                        value={Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1))}
                        onChange={(e) => {
                          const newWidth = parseInt(e.target.value) || 0
                          const currentWidth = (selectedObject.width || 1) * (selectedObject.scaleX || 1)
                          const scaleFactor = newWidth / (selectedObject.width || 1)
                          selectedObject.set('scaleX', scaleFactor)
                          selectedObject.setCoords()
                          fabricCanvasRef.current?.renderAll()
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Height</Label>
                      <Input
                        type="number"
                        value={Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1))}
                        onChange={(e) => {
                          const newHeight = parseInt(e.target.value) || 0
                          const currentHeight = (selectedObject.height || 1) * (selectedObject.scaleY || 1)
                          const scaleFactor = newHeight / (selectedObject.height || 1)
                          selectedObject.set('scaleY', scaleFactor)
                          selectedObject.setCoords()
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
                {(selectedObject.type === 'text' || selectedObject.type === 'i-text') && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-medium text-gray-700">Text Content</Label>
                      <Input
                        type="text"
                        value={(selectedObject as any).text || ''}
                        onChange={(e) => {
                          selectedObject.set('text', e.target.value)
                          fabricCanvasRef.current?.renderAll()
                        }}
                        className="h-8 text-xs mt-1"
                      />
                    </div>

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
                          <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                          <SelectItem value="Impact">Impact</SelectItem>
                          <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-gray-700">Font Weight</Label>
                      <Select 
                        value={(selectedObject as any).fontWeight || 'normal'} 
                        onValueChange={(value) => {
                          selectedObject.set('fontWeight', value)
                          fabricCanvasRef.current?.renderAll()
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="bold">Bold</SelectItem>
                          <SelectItem value="300">Light</SelectItem>
                          <SelectItem value="600">Semi-Bold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-gray-700">Text Align</Label>
                      <Select 
                        value={(selectedObject as any).textAlign || 'left'} 
                        onValueChange={(value) => {
                          selectedObject.set('textAlign', value)
                          fabricCanvasRef.current?.renderAll()
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                          <SelectItem value="justify">Justify</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Stroke/Border for shapes */}
                {(selectedObject.type === 'rect' || selectedObject.type === 'circle' || selectedObject.type === 'triangle' || selectedObject.type === 'polygon') && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-xs font-medium text-gray-700">Stroke Width</Label>
                      <Input
                        type="number"
                        value={Math.round((selectedObject as any).strokeWidth || 0)}
                        onChange={(e) => {
                          selectedObject.set('strokeWidth', parseInt(e.target.value) || 0)
                          fabricCanvasRef.current?.renderAll()
                        }}
                        className="h-8 text-xs mt-1"
                        min="0"
                        max="20"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-gray-700">Stroke Color</Label>
                      <div className="flex space-x-2 mt-1">
                        <Input
                          type="color"
                          value={typeof (selectedObject as any).stroke === 'string' ? (selectedObject as any).stroke : '#000000'}
                          onChange={(e) => {
                            selectedObject.set('stroke', e.target.value)
                            fabricCanvasRef.current?.renderAll()
                          }}
                          className="w-12 h-8"
                        />
                        <Input
                          value={typeof (selectedObject as any).stroke === 'string' ? (selectedObject as any).stroke : '#000000'}
                          onChange={(e) => {
                            selectedObject.set('stroke', e.target.value)
                            fabricCanvasRef.current?.renderAll()
                          }}
                          placeholder="#000000"
                          className="h-8 text-xs"
                        />
                      </div>
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
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                Sticker Settings
                {isTemplateLocked && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Locked
                  </span>
                )}
              </h3>
              
              <div className="space-y-4">
                {/* Size Presets */}
                <div>
                  <Label className="text-xs font-medium text-gray-700">Size Preset</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => applySizePreset('15x15mm')}
                      disabled={isTemplateLocked}
                    >
                      15×15mm
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => applySizePreset('20x20mm')}
                      disabled={isTemplateLocked}
                    >
                      20×20mm
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => applySizePreset('25x25mm')}
                      disabled={isTemplateLocked}
                    >
                      25×25mm
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => applySizePreset('45x45mm')}
                      disabled={isTemplateLocked}
                    >
                      45×45mm
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700">Shape</Label>
                  <Select 
                    value={design.shape} 
                    onValueChange={(value) => updateDesign('shape', value)}
                    disabled={isTemplateLocked}
                  >
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
                      disabled={isTemplateLocked}
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
                      disabled={isTemplateLocked}
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
                      disabled={isTemplateLocked}
                    />
                    <Input
                      value={design.backgroundColor}
                      onChange={(e) => updateDesign('backgroundColor', e.target.value)}
                      placeholder="#ffffff"
                      className="h-8 text-xs"
                      disabled={isTemplateLocked}
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
                    disabled={isTemplateLocked}
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
                    disabled={isTemplateLocked}
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
                    disabled={isTemplateLocked}
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
                      disabled={isTemplateLocked}
                    />
                    <Input
                      value={design.borderColor}
                      onChange={(e) => updateDesign('borderColor', e.target.value)}
                      placeholder="#000000"
                      className="h-8 text-xs"
                      disabled={isTemplateLocked}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700">Border Style</Label>
                  <Select value={design.borderStyle} onValueChange={(value) => updateDesign('borderStyle', value)} disabled={isTemplateLocked}>
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
                    disabled={isTemplateLocked}
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700">Font Family</Label>
                  <Select value={design.taglineFont} onValueChange={(value) => updateDesign('taglineFont', value)} disabled={isTemplateLocked}>
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
                    disabled={isTemplateLocked}
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
                      disabled={isTemplateLocked}
                    />
                    <Input
                      value={design.taglineColor}
                      onChange={(e) => updateDesign('taglineColor', e.target.value)}
                      placeholder="#000000"
                      className="h-8 text-xs"
                      disabled={isTemplateLocked}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-700">Text Alignment</Label>
                  <Select value={design.taglineAlign} onValueChange={(value) => updateDesign('taglineAlign', value)} disabled={isTemplateLocked}>
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
                    disabled={isTemplateLocked}
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
                          disabled={isTemplateLocked}
                        />
                        <Input
                          value={design.shadowColor}
                          onChange={(e) => updateDesign('shadowColor', e.target.value)}
                          placeholder="#000000"
                          className="h-8 text-xs"
                          disabled={isTemplateLocked}
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
                        disabled={isTemplateLocked}
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
                          disabled={isTemplateLocked}
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
                          disabled={isTemplateLocked}
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

      {/* Template Library Modal */}
      {showTemplateLibrary && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Template Library
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowTemplateLibrary(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              {/* Filters */}
              <div className="mb-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search templates..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-700 mb-1 block">Shape</Label>
                    <Select
                      value={templateFilters.shape || 'all'}
                      onValueChange={(value) => setTemplateFilters(prev => ({
                        ...prev,
                        shape: value === 'all' ? undefined : value as any
                      }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Shapes</SelectItem>
                        <SelectItem value="square">Square</SelectItem>
                        <SelectItem value="circle">Circle</SelectItem>
                        <SelectItem value="rectangle-landscape">Rectangle (Landscape)</SelectItem>
                        <SelectItem value="rectangle-portrait">Rectangle (Portrait)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-700 mb-1 block">Size</Label>
                    <Select
                      value={templateFilters.size || 'all'}
                      onValueChange={(value) => setTemplateFilters(prev => ({
                        ...prev,
                        size: value === 'all' ? undefined : value as any
                      }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sizes</SelectItem>
                        <SelectItem value="15x15mm">15×15mm</SelectItem>
                        <SelectItem value="20x20mm">20×20mm</SelectItem>
                        <SelectItem value="25x25mm">25×25mm</SelectItem>
                        <SelectItem value="45x45mm">45×45mm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-700 mb-1 block">Category</Label>
                    <Select
                      value={templateFilters.category || 'all'}
                      onValueChange={(value) => setTemplateFilters(prev => ({
                        ...prev,
                        category: value === 'all' ? undefined : value as any
                      }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="item">Item</SelectItem>
                        <SelectItem value="pet">Pet</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Template Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates
                  .filter(template => {
                    // Search filter
                    if (templateSearch && !template.name.toLowerCase().includes(templateSearch.toLowerCase()) && 
                        !template.description?.toLowerCase().includes(templateSearch.toLowerCase())) {
                      return false
                    }
                    // Shape filter
                    if (templateFilters.shape && template.shape !== templateFilters.shape) {
                      return false
                    }
                    // Size filter
                    if (templateFilters.size && template.size !== templateFilters.size) {
                      return false
                    }
                    // Category filter
                    if (templateFilters.category && template.category !== templateFilters.category) {
                      return false
                    }
                    return true
                  })
                  .map(template => (
                    <Card key={template.id} className="relative hover:shadow-md transition-shadow">
                      {template.isLocked && (
                        <div className="absolute top-2 right-2 z-10">
                          <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Locked
                          </div>
                        </div>
                      )}
                      <div className="aspect-square bg-gray-100 flex items-center justify-center p-4">
                        {template.preview ? (
                          <img src={template.preview} alt={template.name} className="max-w-full max-h-full object-contain" />
                        ) : (
                          <div className="text-gray-400 text-sm">No Preview</div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h4 className="font-semibold text-sm mb-1">{template.name}</h4>
                        {template.description && (
                          <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mb-3">
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded capitalize">{template.shape}</span>
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">{template.size}</span>
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded capitalize">{template.category}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="flex-1 text-xs"
                            onClick={() => {
                              loadTemplate(template)
                              setShowTemplateLibrary(false)
                            }}
                          >
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={() => {
                              deleteTemplate(template.id)
                              setTemplates(loadTemplates())
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
              {templates.filter(template => {
                if (templateSearch && !template.name.toLowerCase().includes(templateSearch.toLowerCase()) && 
                    !template.description?.toLowerCase().includes(templateSearch.toLowerCase())) {
                  return false
                }
                if (templateFilters.shape && template.shape !== templateFilters.shape) return false
                if (templateFilters.size && template.size !== templateFilters.size) return false
                if (templateFilters.category && template.category !== templateFilters.category) return false
                return true
              }).length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No templates found. Create your first template!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save Template Dialog */}
      {showSaveTemplateDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Save as Template</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowSaveTemplateDialog(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  value={saveTemplateData.name}
                  onChange={(e) => setSaveTemplateData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Classic Square Item"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={saveTemplateData.description}
                  onChange={(e) => setSaveTemplateData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Shape *</Label>
                <Select
                  value={saveTemplateData.shape}
                  onValueChange={(value) => setSaveTemplateData(prev => ({ ...prev, shape: value as any }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="circle">Circle</SelectItem>
                    <SelectItem value="rectangle-landscape">Rectangle (Landscape)</SelectItem>
                    <SelectItem value="rectangle-portrait">Rectangle (Portrait)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Size *</Label>
                <Select
                  value={saveTemplateData.size}
                  onValueChange={(value) => setSaveTemplateData(prev => ({ ...prev, size: value as any }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15x15mm">15×15mm</SelectItem>
                    <SelectItem value="20x20mm">20×20mm</SelectItem>
                    <SelectItem value="25x25mm">25×25mm</SelectItem>
                    <SelectItem value="45x45mm">45×45mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category *</Label>
                <Select
                  value={saveTemplateData.category}
                  onValueChange={(value) => setSaveTemplateData(prev => ({ ...prev, category: value as any }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="item">Item</SelectItem>
                    <SelectItem value="pet">Pet</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSaveTemplateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={async () => {
                    await saveAsTemplate(
                      saveTemplateData.name,
                      saveTemplateData.description,
                      saveTemplateData.shape,
                      saveTemplateData.size,
                      saveTemplateData.category,
                      true // Always locked by default
                    )
                    setShowSaveTemplateDialog(false)
                    setSaveTemplateData({
                      name: '',
                      description: '',
                      shape: 'square',
                      size: '25x25mm',
                      category: 'item'
                    })
                    setTemplates(loadTemplates())
                  }}
                  disabled={!saveTemplateData.name.trim()}
                >
                  Save Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}