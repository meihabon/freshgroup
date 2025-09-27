import React, { createContext, useContext, useState, useEffect } from "react"
import axios, { AxiosInstance } from "axios"

interface User {
  id: number
  email: string
  role: "Admin" | "Viewer"
  profile: any
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (email: string, password: string, profile?: any) => Promise<void>
  loading: boolean
  refreshUser: () => Promise<void>
  API: AxiosInstance   // 👈 add this
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const API_URL =
    import.meta.env.VITE_API_URL ||
    "https://heroic-rejoicing-production.up.railway.app/api"

  const API = axios.create({ baseURL: API_URL })

  API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  useEffect(() => {
    refreshUser()
  }, [])

  const refreshUser = async () => {
    try {
      const response = await API.get("/auth/me")
      setUser(response.data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await API.post("/auth/login", { email, password })
      const { access_token, user } = response.data

      localStorage.setItem("token", access_token)
      setUser(user)
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || "Login failed")
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    setUser(null)
  }

  const register = async (email: string, password: string, profile: any = {}) => {
    try {
      await API.post("/auth/register", { email, password, profile })
      await refreshUser()
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || "Registration failed")
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, login, logout, register, loading, refreshUser, API }} // 👈 added API
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
