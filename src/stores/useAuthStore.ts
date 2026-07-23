import { create } from "zustand"
import { User } from "../lib/db/types"
import { getDBClient } from "../lib/db/client"

interface AuthState {
  user: User | null
  isLoading: boolean
  hasCheckedSession: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: { email: string; password: string; birthday?: string; newsletter: boolean }) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  fetchMe: () => Promise<void>
}

function isBrowser() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  } catch {
    return false
  }
}

function getStoredToken() {
  if (!isBrowser()) return null
  try { return localStorage.getItem("cs12_token") } catch { return null }
}

function setStoredToken(token: string) {
  if (!isBrowser()) return
  try { localStorage.setItem("cs12_token", token) } catch {}
}

function clearStoredToken() {
  if (!isBrowser()) return
  try { localStorage.removeItem("cs12_token") } catch {}
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  hasCheckedSession: false,

  fetchMe: async () => {
    const token = getStoredToken()
    if (!token) {
      set({ user: null, isLoading: false, hasCheckedSession: true })
      return
    }
    set({ isLoading: true })
    try {
      const db = getDBClient()
      const user = await db.getUserById(token)
      if (user) {
        set({ user, isLoading: false, hasCheckedSession: true })
      } else {
        clearStoredToken()
        set({ user: null, isLoading: false, hasCheckedSession: true })
      }
    } catch {
      set({ isLoading: false, hasCheckedSession: true })
    }
  },

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const db = getDBClient()
      const user = await db.getUserByEmail(email.trim())
      if (!user) return { success: false, error: "User not found" }
      if (user.passwordHash !== password) return { success: false, error: "Incorrect password" }
      const lastLogin = new Date().toISOString()
      setStoredToken(user.id)
      await db.updateUser(user.id, { lastLogin })
      set({ user: { ...user, lastLogin }, hasCheckedSession: true })
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    } finally {
      set({ isLoading: false })
    }
  },

  register: async ({ email, password, birthday, newsletter }) => {
    set({ isLoading: true })
    try {
      const db = getDBClient()
      const normalizedEmail = email.trim().toLowerCase()
      const existing = await db.getUserByEmail(normalizedEmail)
      if (existing) return { success: false, error: "Email already registered" }
      const newUser: User = {
        id: "u_" + Date.now(),
        email: normalizedEmail,
        username: normalizedEmail.split("@")[0],
        passwordHash: password,
        role: "customer",
        birthday,
        newsletter,
        points: 0,
        pointsHistory: [],
        createdAt: new Date().toISOString(),
        totalSpentHKD: 0,
        totalOrders: 0,
        tier: "Member",
        isFirstOrder: true
      }
      await db.createUser(newUser)
      setStoredToken(newUser.id)
      set({ user: newUser, hasCheckedSession: true })
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    clearStoredToken()
    set({ user: null, hasCheckedSession: true })
  }
}))
