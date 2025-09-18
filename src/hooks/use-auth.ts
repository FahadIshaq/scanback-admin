"use client"

import { useState, useEffect } from "react"
import adminApiClient from "@/lib/api"

interface Admin {
  id: string
  email: string
  name: string
  role: string
  permissions: string[]
}

export function useAuth() {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("admin_token")
        console.log('Checking auth with token:', token ? 'exists' : 'none')
        if (token) {
          // Set the token in the API client
          adminApiClient.setToken(token)
          
          try {
            const response = await adminApiClient.getCurrentAdmin()
            console.log('Auth check response:', response)
            if (response.success) {
              setAdmin(response.data.user)
              console.log('Admin set from token:', response.data.user)
            } else {
              console.log('Auth check failed, clearing token')
              adminApiClient.clearToken()
            }
          } catch (apiError) {
            console.error('API call failed:', apiError)
            adminApiClient.clearToken()
          }
        } else {
          console.log('No token found')
        }
      } catch (error) {
        console.error("Auth check failed:", error)
        adminApiClient.clearToken()
      } finally {
        console.log('Setting loading to false')
        setLoading(false)
      }
    }

    // Add a small delay to ensure the component is mounted
    const timer = setTimeout(checkAuth, 100)
    return () => clearTimeout(timer)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      console.log('Attempting login with:', { email, password: '***' })
      const response = await adminApiClient.adminLogin({ email, password })
      console.log('Login response:', response)
      
      if (response.success) {
        console.log('Login successful, setting admin:', response.data.user)
        setAdmin(response.data.user)
        // Force a small delay to ensure state updates
        setTimeout(() => {
          console.log('Login completed, admin state should be set')
        }, 100)
        return { success: true, admin: response.data.user }
      } else {
        console.log('Login failed:', response.message)
        return { success: false, message: response.message }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      return { success: false, message: error.message || 'Login failed' }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    console.log('Logout called')
    setAdmin(null)
    adminApiClient.clearToken()
    console.log('Admin state cleared, token removed')
    // Force a small delay to ensure state updates
    setTimeout(() => {
      console.log('Logout completed')
    }, 100)
  }

  return {
    admin,
    loading,
    login,
    logout,
    isAuthenticated: !!admin
  }
}
