import { Tag, PawPrint, Layers } from "lucide-react"
import { MedicalCross as MedicalCrossIcon } from "@/components/MedicalCross"

export type QRType = "item" | "pet" | "emergency" | "general"

export interface TypeConfig {
  label: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  bgColor: string
  iconColor: string
}

export const TYPE_CONFIG: Record<QRType, TypeConfig> = {
  item: {
    label: "Item",
    icon: Tag,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  pet: {
    label: "Pet",
    icon: PawPrint,
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-600",
  },
  emergency: {
    label: "Emergency",
    icon: MedicalCrossIcon,
    bgColor: "bg-red-50",
    iconColor: "text-red-600",
  },
  general: {
    label: "General",
    icon: Layers,
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
}

export function getTypeConfig(type: string): TypeConfig {
  const normalizedType = type === "any" ? "general" : type
  return TYPE_CONFIG[normalizedType as QRType] || TYPE_CONFIG.general
}

export function getTypeLabel(type: string): string {
  const normalizedType = type === "any" ? "general" : type
  return TYPE_CONFIG[normalizedType as QRType]?.label || "General"
}

export function getTypeIcon(type: string, className?: string, size: number = 16) {
  const config = getTypeConfig(type)
  const Icon = config.icon
  return <Icon className={className || `h-${size} w-${size} ${config.iconColor}`} size={size} />
}

export function normalizeType(type: string): QRType {
  if (type === "any") return "general"
  return (type as QRType) || "general"
}

