// Persistent Web Push Subscription Store
import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join('/tmp', 'rg_subscriptions.json');

let inMemorySubscriptions = [];

// Initialize from disk if available
try {
  if (fs.existsSync(STORE_PATH)) {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    inMemorySubscriptions = JSON.parse(raw);
  }
} catch (e) {
  inMemorySubscriptions = [];
}

function persistToDisk() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(inMemorySubscriptions, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[SubscriptionStore] Could not write subscriptions to disk:', err);
  }
}

/**
 * Save or update a user's device subscription
 */
export function saveSubscription({ subscription, username, userEmail, userRole, deviceInfo }) {
  if (!subscription || !subscription.endpoint) return null;

  const endpoint = subscription.endpoint;
  const now = new Date().toISOString();

  const existingIndex = inMemorySubscriptions.findIndex((sub) => sub.endpoint === endpoint);

  const entry = {
    endpoint,
    keys: subscription.keys || {},
    username: username || 'মেসেঞ্জার ইউজার',
    userEmail: userEmail || '',
    userRole: userRole || 'মেম্বার',
    deviceInfo: deviceInfo || {},
    updatedAt: now,
    lastActive: Date.now()
  };

  if (existingIndex >= 0) {
    inMemorySubscriptions[existingIndex] = {
      ...inMemorySubscriptions[existingIndex],
      ...entry
    };
  } else {
    inMemorySubscriptions.push(entry);
  }

  persistToDisk();
  return entry;
}

/**
 * Get all active subscriptions
 */
export function getAllSubscriptions() {
  return inMemorySubscriptions;
}

/**
 * Get subscriptions for a specific username
 */
export function getSubscriptionsForUser(username) {
  if (!username) return [];
  const normalized = username.trim().toLowerCase();
  return inMemorySubscriptions.filter(
    (sub) => sub.username && sub.username.trim().toLowerCase() === normalized
  );
}

/**
 * Get subscriptions for broadcast, excluding the sender
 */
export function getSubscriptionsExcludingUser(senderUsername) {
  if (!senderUsername) return inMemorySubscriptions;
  const normalized = senderUsername.trim().toLowerCase();
  return inMemorySubscriptions.filter(
    (sub) => !sub.username || sub.username.trim().toLowerCase() !== normalized
  );
}

/**
 * Remove an invalid or expired subscription (e.g., 404 or 410 Gone)
 */
export function removeSubscriptionByEndpoint(endpoint) {
  if (!endpoint) return;
  inMemorySubscriptions = inMemorySubscriptions.filter((sub) => sub.endpoint !== endpoint);
  persistToDisk();
}

/**
 * Get store statistics
 */
export function getSubscriptionStats() {
  const users = new Set(inMemorySubscriptions.map((s) => s.username).filter(Boolean));
  return {
    totalDevices: inMemorySubscriptions.length,
    totalUsers: users.size,
    userList: Array.from(users)
  };
}
