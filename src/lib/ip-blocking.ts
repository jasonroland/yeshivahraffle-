import { db } from '@/src/db';
import { blockedIps, failedPaymentAttempts } from '@/src/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

// Configuration
const MAX_FAILED_ATTEMPTS = 4; // Block after 4 declined charges
const TIME_WINDOW_MINUTES = 60; // Count failures within last 60 minutes
const BLOCK_DURATION_HOURS = 24; // Block for 24 hours (null = permanent)

/**
 * Extract IP address from request headers
 * Handles various proxy headers (Vercel, Cloudflare, etc.)
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;

  // Check various headers in order of preference
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, first one is the client
    return forwardedFor.split(',')[0].trim();
  }

  // Vercel-specific header
  const vercelForwardedFor = headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }

  // Cloudflare header
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Real IP header (nginx)
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback - this shouldn't happen in production
  return 'unknown';
}

/**
 * Check if an IP address is currently blocked
 */
export async function isIpBlocked(ipAddress: string): Promise<boolean> {
  if (ipAddress === 'unknown') return false;

  const blocked = await db
    .select()
    .from(blockedIps)
    .where(
      and(
        eq(blockedIps.ipAddress, ipAddress),
        eq(blockedIps.isActive, true)
      )
    )
    .limit(1);

  if (blocked.length === 0) return false;

  const block = blocked[0];

  // Check if block has expired
  if (block.expiresAt && new Date() > block.expiresAt) {
    // Deactivate expired block
    await db
      .update(blockedIps)
      .set({ isActive: false })
      .where(eq(blockedIps.id, block.id));
    return false;
  }

  return true;
}

/**
 * Record a failed payment attempt and block IP if threshold exceeded
 * Returns true if IP was blocked as a result of this attempt
 */
export async function recordFailedAttempt(
  ipAddress: string,
  cardLastFour?: string,
  declineReason?: string
): Promise<{ blocked: boolean; attemptCount: number }> {
  if (ipAddress === 'unknown') {
    return { blocked: false, attemptCount: 0 };
  }

  // Record the failed attempt
  await db.insert(failedPaymentAttempts).values({
    ipAddress,
    cardLastFour,
    declineReason,
  });

  // Count recent failed attempts from this IP
  const windowStart = new Date(Date.now() - TIME_WINDOW_MINUTES * 60 * 1000);

  const recentAttempts = await db
    .select({ count: sql<number>`count(*)` })
    .from(failedPaymentAttempts)
    .where(
      and(
        eq(failedPaymentAttempts.ipAddress, ipAddress),
        gte(failedPaymentAttempts.attemptedAt, windowStart)
      )
    );

  const attemptCount = recentAttempts[0]?.count || 0;

  // Block if threshold exceeded
  if (attemptCount >= MAX_FAILED_ATTEMPTS) {
    await blockIp(ipAddress, `Exceeded ${MAX_FAILED_ATTEMPTS} failed payment attempts`, attemptCount);
    return { blocked: true, attemptCount };
  }

  return { blocked: false, attemptCount };
}

/**
 * Block an IP address
 */
export async function blockIp(
  ipAddress: string,
  reason: string,
  failedAttempts: number = 0
): Promise<void> {
  const expiresAt = BLOCK_DURATION_HOURS
    ? new Date(Date.now() + BLOCK_DURATION_HOURS * 60 * 60 * 1000)
    : null;

  // Use upsert to handle existing blocks
  await db
    .insert(blockedIps)
    .values({
      ipAddress,
      reason,
      failedAttempts,
      expiresAt,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: blockedIps.ipAddress,
      set: {
        reason,
        failedAttempts,
        blockedAt: new Date(),
        expiresAt,
        isActive: true,
      },
    });
}

/**
 * Get remaining attempts before block
 */
export async function getRemainingAttempts(ipAddress: string): Promise<number> {
  if (ipAddress === 'unknown') return MAX_FAILED_ATTEMPTS;

  const windowStart = new Date(Date.now() - TIME_WINDOW_MINUTES * 60 * 1000);

  const recentAttempts = await db
    .select({ count: sql<number>`count(*)` })
    .from(failedPaymentAttempts)
    .where(
      and(
        eq(failedPaymentAttempts.ipAddress, ipAddress),
        gte(failedPaymentAttempts.attemptedAt, windowStart)
      )
    );

  const attemptCount = recentAttempts[0]?.count || 0;
  return Math.max(0, MAX_FAILED_ATTEMPTS - attemptCount);
}
