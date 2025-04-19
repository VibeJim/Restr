import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { bech32 } from '@scure/base';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert bech32 encoded string to hex format
 */
export function bech32ToHex(str: string): string | null {
  try {
    if (!str.includes('npub') && !str.includes('note')) return str;
    
    const decoded = bech32.decode(str, 1000);
    const data = bech32.fromWords(decoded.words);
    return Buffer.from(data).toString('hex');
  } catch (e) {
    console.error('Error converting bech32 to hex:', e);
    return null;
  }
}

/**
 * Format a timestamp to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const secondsAgo = now - timestamp;
  
  if (secondsAgo < 60) {
    return 'just now';
  } else if (secondsAgo < 3600) {
    const minutes = Math.floor(secondsAgo / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (secondsAgo < 86400) {
    const hours = Math.floor(secondsAgo / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (secondsAgo < 2592000) {
    const days = Math.floor(secondsAgo / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else if (secondsAgo < 31536000) {
    const months = Math.floor(secondsAgo / 2592000);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    const years = Math.floor(secondsAgo / 31536000);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
}
