import { create } from "zustand"
import { User } from "../lib/db/types"
import { getDBClient } from "../lib/db/client"
import { subscribeToNewsletter } from "../lib/newsletter/subscribe"

interface AuthState {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: { email: string; password: string; birthday?: string; newsletter: boolean }) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,

  fetchMe: async () => {
    const token = localStorage.getItem("cs12_token")
    if (!token) return
    try {
      const db = getDBClient()
      const user = await db.getUserById(token)
      if (user) set({ user })
    } catch {}
  },

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const db = getDBClient()
      const user = await db.getUserByEmail(email)
      if (!user) return { success: false, error: "User not found" }
      if (user.passwordHash !== password) return { success: false, error: "Incorrect password" }
      localStorage.setItem("cs12_token", user.id)
      await db.updateUser(user.id, { lastLogin: new Date().toISOString() })
      set({ user: { ...user, lastLogin: new Date().toISOString() } })
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
      const existing = await db.getUserByEmail(email)
      if (existing) return { success: false, error: "Email already registered" }
      const newUser: User = {
        id: "u_" + Date.now(),
        email,
        username: email.split("@")[0],
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
      if (newsletter) {
        await subscribeToNewsletter(email, "registration", ["registered-customer"])
      }
      localStorage.setItem("cs12_token", newUser.id)
      set({ user: newUser })
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    localStorage.removeItem("cs12_token")
    set({ user: null })
  }
}))
