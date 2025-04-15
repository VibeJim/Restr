export interface NostrProfile {
  name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
  lud16?: string; // Lightning address for payments
  [key: string]: any;
}

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  [key: string]: string[] | number[] | number | undefined;
}

export interface NostrRelay {
  url: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: Error;
}

export interface NostrListingContent {
  title: string;
  description: string;
  location: string;
  price: number;
  currency: string;
  images: string[];
  beds: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
  [key: string]: any;
}

export interface NostrListing {
  id: string;
  pubkey: string;
  created_at: number;
  content: NostrListingContent;
  tags: string[][];
}

export interface NostrUser {
  pubkey: string;
  npub: string;
  profile?: NostrProfile;
  relays?: string[];
}

export interface NostrBookingContent {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  message?: string;
}

export interface NostrReviewContent {
  listingId: string;
  rating: number;
  content: string;
}

export interface NostrZapRequest {
  pubkey: string;
  amount: number;
  relays: string[];
  comment?: string;
  lnurl?: string;
  [key: string]: any;
}
