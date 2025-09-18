"use client"

import { useAuth } from "@/hooks/use-auth"
import { AdminDashboard } from "@/components/admin-dashboard"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function DashboardPage() {
  const { admin, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !admin) {
      router.push('/login')
    }
  }, [admin, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!admin) {
    return null // Will redirect to login
  }

  return <AdminDashboard />
}
