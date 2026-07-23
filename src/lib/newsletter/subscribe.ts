import { getDBClient } from "../db/client"
import type { NewsletterSubscriber } from "../db/types"

export type NewsletterSubscriptionResult = "created" | "already-subscribed" | "reactivated"

function createSubscriberId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `newsletter_${crypto.randomUUID()}`
  }
  return `newsletter_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

/**
 * Save a newsletter subscription through the configured database client.
 * All public newsletter forms should use this function so the admin list and
 * the form write to the same data source.
 */
export async function subscribeToNewsletter(
  email: string,
  source: string,
  tags: string[] = []
): Promise<NewsletterSubscriptionResult> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) throw new Error("Email is required")

  const db = getDBClient()
  const subscribers = await db.getNewsletterSubscribers()
  const existing = subscribers.find(
    subscriber => subscriber.email.toLowerCase() === normalizedEmail
  )

  if (existing) {
    if (existing.isActive) return "already-subscribed"

    await db.updateNewsletterSubscriber(existing.id, {
      isActive: true,
      source,
      subscribedAt: new Date().toISOString(),
      unsubscribedAt: undefined,
      tags: Array.from(new Set([...(existing.tags || []), ...tags]))
    })
    return "reactivated"
  }

  const subscriber: NewsletterSubscriber = {
    id: createSubscriberId(),
    email: normalizedEmail,
    source,
    subscribedAt: new Date().toISOString(),
    isActive: true,
    tags
  }
  await db.createNewsletterSubscriber(subscriber)
  return "created"
}
