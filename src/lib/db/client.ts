import { Product, User, Order, Coupon, GiftTier, PointsTransaction, BirthdayReward } from "./types"

export interface DBClient {
  // products
  getProducts(): Promise<Product[]>
  getProductBySlug(slug: string): Promise<Product | null>
  getProductById(id: string): Promise<Product | null>
  createProduct(p: Product): Promise<void>
  updateProduct(id: string, patch: Partial<Product>): Promise<void>
  deleteProduct(id: string): Promise<void>

  // users
  getUsers(): Promise<User[]>
  getUserById(id: string): Promise<User | null>
  getUserByEmail(email: string): Promise<User | null>
  createUser(u: User): Promise<void>
  updateUser(id: string, patch: Partial<User>): Promise<void>

  // orders
  getOrders(): Promise<Order[]>
  getOrdersByUserId(userId: string): Promise<Order[]>
  getOrderById(id: string): Promise<Order | null>
  createOrder(o: Order): Promise<void>
  updateOrder(id: string, patch: Partial<Order>): Promise<void>

  // coupons
  getCoupons(): Promise<Coupon[]>
  getCouponByCode(code: string): Promise<Coupon | null>
  createCoupon(c: Coupon): Promise<void>
  updateCoupon(code: string, patch: Partial<Coupon>): Promise<void>
  deleteCoupon(code: string): Promise<void>

  // gift tiers
  getGiftTiers(): Promise<GiftTier[]>
  createGiftTier(tier: GiftTier): Promise<void>
  updateGiftTier(id: string, patch: Partial<GiftTier>): Promise<void>
  deleteGiftTier(id: string): Promise<void>

  // points
  addPointsTransaction(tx: PointsTransaction): Promise<void>

  // birthday
  getBirthdayRewards(userId: string): Promise<BirthdayReward[]>
  createBirthdayReward(r: BirthdayReward): Promise<void>
}

let _client: DBClient | null = null

export function setDBClient(c: DBClient) {
  _client = c
}

export function getDBClient(): DBClient {
  if (!_client) throw new Error("DBClient not initialized")
  return _client
}
