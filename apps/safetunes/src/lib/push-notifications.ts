// Push notification utilities for SafeTunes

// VAPID public key (same as configured in Convex)
const VAPID_PUBLIC_KEY = 'BDuPhaKfnr489e_fKI9CLO8lpIwqfK5gAG-rvz1rM0S0s_hjnusicLPs9o0IGsj0G2GVExbDCE6DOdWsCIY89Eg';

/**
 * Convert a base64 string to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  return registration;
}

/**
 * Subscribe to push notifications
 * Returns the subscription object that should be saved to the server
 */
export async function subscribeToPush(): Promise<{
  endpoint: string;
  p256dh: string;
  auth: string;
} | null> {
  if (!isPushSupported()) {
    console.error('Push notifications not supported');
    return null;
  }

  // Request permission first
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    console.log('Notification permission denied');
    return null;
  }

  // Register service worker
  const registration = await registerServiceWorker();

  // Wait for the service worker to be ready
  await navigator.serviceWorker.ready;

  // Subscribe to push
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // Extract the keys
  const rawKey = subscription.getKey('p256dh');
  const rawAuth = subscription.getKey('auth');

  if (!rawKey || !rawAuth) {
    throw new Error('Failed to get subscription keys');
  }

  // Convert to base64 for storage
  const p256dh = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
  const auth = btoa(String.fromCharCode(...new Uint8Array(rawAuth)));

  return {
    endpoint: subscription.endpoint,
    p256dh,
    auth,
  };
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<string | null> {
  if (!isPushSupported()) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    return endpoint;
  }

  return null;
}

/**
 * Check if currently subscribed to push notifications
 */
export async function isSubscribedToPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/**
 * Get device info string for subscription tracking
 */
export function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  const browserMatch = ua.match(/(Chrome|Safari|Firefox|Edge|Opera)\/[\d.]+/);
  const osMatch = ua.match(/(Mac|Windows|Linux|Android|iPhone|iPad)/i);

  const browser = browserMatch ? browserMatch[1] : 'Unknown';
  const os = osMatch ? osMatch[1] : 'Unknown';

  return `${browser} on ${os}`;
}
