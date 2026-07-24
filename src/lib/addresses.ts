/** Shared address-book helpers (localStorage-backed per user). */

export interface SavedAddress {
  id: string
  /** User-facing label used when choosing / switching addresses. Required. */
  addressName: string
  firstName: string
  lastName: string
  company?: string
  /** Full person name (first + last), kept for display / order payload. */
  name: string
  phone: string
  address: string
  address2?: string
  district: string
  region?: string
  isDefault: boolean
}

const keyFor = (userId: string) => `cs12_addresses_${userId}`

export function loadAddresses(userId: string): SavedAddress[] {
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Normalize legacy entries that may lack addressName
    return parsed.map((a: any, i: number) => ({
      id: a.id || `addr_${i}_${Date.now()}`,
      addressName: a.addressName || a.label || a.name || `Address ${i + 1}`,
      firstName: a.firstName || "",
      lastName: a.lastName || "",
      company: a.company || "",
      name: a.name || `${a.firstName || ""} ${a.lastName || ""}`.trim(),
      phone: a.phone || "",
      address: a.address || "",
      address2: a.address2 || "",
      district: a.district || "",
      region: a.region || "HKD",
      isDefault: !!a.isDefault,
    })) as SavedAddress[]
  } catch {
    return []
  }
}

export function saveAddresses(userId: string, addrs: SavedAddress[]): void {
  localStorage.setItem(keyFor(userId), JSON.stringify(addrs))
}

export function getDefaultAddress(userId: string): SavedAddress | null {
  const addrs = loadAddresses(userId)
  if (addrs.length === 0) return null
  return addrs.find(a => a.isDefault) || addrs[0]
}

/**
 * Save a new address into the user's address book.
 * - If this is the first address, it is marked default.
 * - Otherwise it is saved without changing the existing default.
 * Returns the saved address (or the existing duplicate if found).
 */
export function addAddressToBook(
  userId: string,
  addr: Omit<SavedAddress, "id" | "isDefault"> & { isDefault?: boolean }
): { address: SavedAddress; created: boolean; wasFirst: boolean } {
  const addrs = loadAddresses(userId)
  const wasFirst = addrs.length === 0

  // Treat same phone + street + district as duplicate
  const duplicate = addrs.find(
    a =>
      a.phone === addr.phone &&
      a.address === addr.address &&
      a.district === addr.district
  )
  if (duplicate) {
    return { address: duplicate, created: false, wasFirst }
  }

  const newAddr: SavedAddress = {
    id: "addr_" + Date.now(),
    addressName: addr.addressName.trim(),
    firstName: addr.firstName,
    lastName: addr.lastName,
    company: addr.company || "",
    name: addr.name || `${addr.firstName} ${addr.lastName}`.trim(),
    phone: addr.phone,
    address: addr.address,
    address2: addr.address2 || "",
    district: addr.district,
    region: addr.region || "HKD",
    isDefault: wasFirst ? true : !!addr.isDefault,
  }

  // If explicitly marking default (and not first), clear other defaults
  if (newAddr.isDefault && !wasFirst) {
    addrs.forEach(a => { a.isDefault = false })
  }

  addrs.push(newAddr)
  saveAddresses(userId, addrs)
  return { address: newAddr, created: true, wasFirst }
}

/** Currently selected shipping address id for cart / checkout (session-level). */
const SELECTED_KEY = "cs12_selected_address"

export function getSelectedAddressId(userId: string): string | null {
  try {
    return localStorage.getItem(`${SELECTED_KEY}_${userId}`)
  } catch {
    return null
  }
}

export function setSelectedAddressId(userId: string, addressId: string | null): void {
  try {
    if (addressId) localStorage.setItem(`${SELECTED_KEY}_${userId}`, addressId)
    else localStorage.removeItem(`${SELECTED_KEY}_${userId}`)
  } catch {}
}

export function getSelectedAddress(userId: string): SavedAddress | null {
  const addrs = loadAddresses(userId)
  if (addrs.length === 0) return null
  const selectedId = getSelectedAddressId(userId)
  if (selectedId) {
    const found = addrs.find(a => a.id === selectedId)
    if (found) return found
  }
  return addrs.find(a => a.isDefault) || addrs[0]
}
