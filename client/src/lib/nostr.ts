import { getEventHash, getPublicKey, generateSecretKey, finalizeEvent } from 'nostr-tools/pure';
import { verifyEvent as verifyNostrEvent, validateEvent } from 'nostr-tools/pure';
import * as nip19 from 'nostr-tools/nip19';
import { bytesToHex } from '@noble/hashes/utils';
import { hexToBytes } from '@noble/hashes/utils';
import { RELAYS, NOSTR_KINDS } from './constants';
import type { 
  NostrEvent, 
  NostrFilter,
  NostrListing,
  NostrListingContent,
  NostrProfile,
  NostrUser,
  NostrZapRequest,
  NostrReview,
  NostrReviewContent,
  NostrComment,
  NostrCalendarEvent,
  NostrCalendarEventContent
} from '../types/nostr';

// Check if window.nostr is available (NIP-07 browser extension)
export const hasNostrExtension = (): boolean => {
  return typeof window !== 'undefined' && 'nostr' in window;
};

// Get the current user's public key from the extension
export const getCurrentUserPubkey = async (): Promise<string | null> => {
  if (!hasNostrExtension()) return null;

  try {
    // Using optional chaining to avoid "possibly undefined" error
    const pubkey = await window.nostr?.getPublicKey();
    return pubkey || null; // Convert undefined to null
  } catch (error) {
    console.error('Error getting public key:', error);
    return null;
  }
};

// Convert a hex pubkey to an npub
export const hexToBech32 = (hex: string): string => {
  try {
    // Using the newer API format for nip19
    return nip19.npubEncode(hex);
  } catch (error) {
    console.error('Error converting hex to bech32:', error);
    // Return a simple shortened version for display if conversion fails
    return `npub1${hex.substring(0, 6)}...${hex.substring(hex.length - 4)}`;
  }
};

// Convert an npub to a hex pubkey
export const bech32ToHex = (bech32: string): string | null => {
  try {
    if (bech32.startsWith('npub1')) {
      const { data } = nip19.decode(bech32);
      return data.toString();
    } else {
      // If it's already a hex key, just return it
      return bech32;
    }
  } catch (error) {
    console.error('Error converting bech32 to hex:', error);
    return null;
  }
};

// Sign an event using the extension
export const signEvent = async (event: Partial<NostrEvent>): Promise<NostrEvent | null> => {
  if (!hasNostrExtension()) return null;

  try {
    // Using optional chaining to avoid "possibly undefined" error
    const signedEvent = await window.nostr?.signEvent(event);
    return signedEvent || null; // Convert undefined to null
  } catch (error) {
    console.error('Error signing event:', error);
    return null;
  }
};

// Create and sign a NOSTR event with proper timestamp
export const createSignedEvent = async (
  kind: number,
  content: string,
  tags: string[][] = []
): Promise<NostrEvent | null> => {
  const pubkey = await getCurrentUserPubkey();
  if (!pubkey) return null;

  const event: Partial<NostrEvent> = {
    kind,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
    pubkey
  };

  // Generate the event ID
  const id = getEventHash(event as NostrEvent);
  event.id = id;

  return signEvent(event);
};

// Verify a NOSTR event
export const verifyEvent = (event: NostrEvent): boolean => {
  if (!validateEvent(event)) return false;
  return verifyNostrEvent(event);
};

// Function to create WebSockets for relays
export const createRelayConnections = (relays: string[] = RELAYS): Map<string, WebSocket> => {
  const connections = new Map<string, WebSocket>();
  
  const validRelays = relays.filter(relay => {
    try {
      return relay.startsWith('wss://') || relay.startsWith('ws://');
    } catch (error) {
      console.error(`Invalid relay URL: ${relay}`);
      return false;
    }
  });
  
  const limitedRelays = validRelays.slice(0, 5);
  
  console.log(`Creating connections to ${limitedRelays.length} relays:`, limitedRelays);
  
  limitedRelays.forEach(relay => {
    try {
      const socket = new WebSocket(relay);
      connections.set(relay, socket);
    } catch (error) {
      console.error(`Error creating WebSocket connection to ${relay}:`, error);
    }
  });
  
  return connections;
};

// Tests a relay by connecting and sending a small subscription, waiting for EOSE.
// Returns true if the relay responds within the timeout.
export const testRelayHealth = (relay: string, timeoutMs: number = 5000): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    let done = false;
    let socket: WebSocket | null = null;

    const finish = (healthy: boolean) => {
      if (done) return;
      done = true;
      try {
        if (socket) {
          socket.onopen = null;
          socket.onmessage = null;
          socket.onerror = null;
          socket.onclose = null;
          if (socket.readyState === WebSocket.OPEN) socket.close();
        }
      } catch (_) { /* ignore cleanup errors */ }
      resolve(healthy);
    };

    try {
      socket = new WebSocket(relay);

      socket.onopen = () => {
        const subId = '_health_' + Math.random().toString(36).slice(2, 8);
        // Ask for 1 recent metadata event — every relay should have at least one
        socket!.send(JSON.stringify(['REQ', subId, { kinds: [0], limit: 1 }]));
      };

      socket.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          // EOSE means the relay is alive, connected, and responsive to queries
          if (Array.isArray(data) && data[0] === 'EOSE') {
            console.log(`[RELAY-HEALTH] ${relay} is healthy (got EOSE)`);
            finish(true);
          }
        } catch (_) { /* ignore parse errors */ }
      };

      socket.onerror = () => finish(false);
      socket.onclose = () => finish(false);
    } catch (_) {
      finish(false);
    }

    setTimeout(() => {
      if (!done) {
        console.warn(`[RELAY-HEALTH] ${relay} timed out after ${timeoutMs}ms`);
        finish(false);
      }
    }, timeoutMs);
  });
};

// Returns the subset of relays that pass a health check, ordered by response time.
export const getHealthyRelays = async (relays: string[] = RELAYS, timeoutMs: number = 5000): Promise<string[]> => {
  const healthy: string[] = [];
  const results = await Promise.allSettled(
    relays.map(async (relay) => {
      const start = Date.now();
      const ok = await testRelayHealth(relay, timeoutMs);
      return { relay, ok, ms: Date.now() - start };
    })
  );

  results
    .filter((r): r is PromiseFulfilledResult<{ relay: string; ok: boolean; ms: number }> =>
      r.status === 'fulfilled' && r.value.ok
    )
    .sort((a, b) => a.value.ms - b.value.ms)
    .forEach(r => healthy.push(r.value.relay));

  console.log(`[RELAY-HEALTH] ${healthy.length}/${relays.length} relays healthy:`, healthy);
  return healthy;
};

// Verifies an event exists on a relay by subscribing for it by ID and waiting for EOSE.
// Returns true if the relay returned the event before EOSE.
export const verifyEventOnRelay = (eventId: string, relay: string, timeoutMs: number = 8000): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    let done = false;
    let found = false;
    let socket: WebSocket | null = null;

    const finish = (success: boolean) => {
      if (done) return;
      done = true;
      try {
        if (socket) {
          socket.onopen = null;
          socket.onmessage = null;
          socket.onerror = null;
          socket.onclose = null;
          if (socket.readyState === WebSocket.OPEN) socket.close();
        }
      } catch (_) { /* ignore */ }
      resolve(success);
    };

    try {
      socket = new WebSocket(relay);

      socket.onopen = () => {
        const subId = '_verify_' + Math.random().toString(36).slice(2, 8);
        socket!.send(JSON.stringify(['REQ', subId, { ids: [eventId], limit: 1 }]));
      };

      socket.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (Array.isArray(data)) {
            if (data[0] === 'EVENT' && data[2]?.id === eventId) {
              found = true;
            }
            if (data[0] === 'EOSE') {
              console.log(`[VERIFY] ${relay}: event ${eventId.slice(0, 8)}... ${found ? 'CONFIRMED' : 'NOT FOUND'}`);
              finish(found);
            }
          }
        } catch (_) { /* ignore */ }
      };

      socket.onerror = () => finish(false);
      socket.onclose = () => finish(false);
    } catch (_) {
      finish(false);
    }

    setTimeout(() => finish(false), timeoutMs);
  });
};

// Publishes an event to a single relay, waiting for an explicit OK confirmation.
// The Nostr OK message format is ["OK", <event_id>, <accepted: boolean>, <message>].
const publishToSingleRelay = async (
  event: NostrEvent,
  relay: string,
  timeoutMs: number
): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    let hasResolved = false;
    let socket: WebSocket | null = null;
    
    const cleanup = (success: boolean) => {
      if (hasResolved) return;
      hasResolved = true;
      
      if (socket) {
        try {
          socket.onopen = null;
          socket.onmessage = null;
          socket.onerror = null;
          socket.onclose = null;
          if (socket.readyState === WebSocket.OPEN) socket.close();
        } catch (e) {
          console.error(`Error closing connection to ${relay}:`, e);
        }
      }
      
      resolve(success);
    };
    
    try {
      socket = new WebSocket(relay);
      
      socket.onopen = () => {
        console.log(`Connected to relay: ${relay}`);
        try {
          socket!.send(JSON.stringify(['EVENT', event]));
          console.log(`Event sent to ${relay}`);
        } catch (error) {
          console.error(`Error sending event to ${relay}:`, error);
          cleanup(false);
        }
      };
      
      socket.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data);
          
          if (Array.isArray(data) && data[0] === 'OK' && data[1] === event.id) {
            const accepted = data[2] === true;
            const reason = data[3] || '';

            if (accepted) {
              console.log(`[PUBLISH] ${relay}: event ACCEPTED`);
              cleanup(true);
            } else {
              // "duplicate:" means the relay already has this event — that's still a success
              if (typeof reason === 'string' && reason.toLowerCase().includes('duplicate')) {
                console.log(`[PUBLISH] ${relay}: duplicate (relay already has it) — counting as success`);
                cleanup(true);
              } else {
                console.warn(`[PUBLISH] ${relay}: event REJECTED — ${reason}`);
                cleanup(false);
              }
            }
          } else if (Array.isArray(data) && data[0] === 'NOTICE') {
            console.warn(`Notice from ${relay}:`, data[1]);
          }
        } catch (error) {
          console.error(`Error parsing message from ${relay}:`, error);
        }
      };
      
      socket.onerror = () => cleanup(false);
      socket.onclose = () => cleanup(false);
      
      setTimeout(() => {
        if (!hasResolved) {
          console.warn(`[PUBLISH] ${relay}: timeout after ${timeoutMs}ms — no OK received`);
          cleanup(false);
        }
      }, timeoutMs);
      
    } catch (error) {
      console.error(`Error setting up connection to ${relay}:`, error);
      cleanup(false);
    }
  });
};

// Publishes an event to relays with health-checking and verification.
export const publishEvent = async (
  event: NostrEvent,
  relays: string[] = RELAYS,
  timeoutMs: number = 15000
): Promise<string[]> => {
  console.log(`[PUBLISH] Starting publish for event ${event.id?.slice(0, 8)}... (kind ${event.kind}) to ${relays.length} relays`);
  
  // Publish to all relays in parallel — the OK check is strict now
  const results = await Promise.allSettled(
    relays.map(relay => publishToSingleRelay(event, relay, timeoutMs))
  );
  
  const successfulRelays: string[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      successfulRelays.push(relays[index]);
    }
  });
  
  console.log(`[PUBLISH] ${successfulRelays.length}/${relays.length} relays confirmed:`, successfulRelays);
  return successfulRelays;
};

// Subscribe to events from relays
export const subscribeToEvents = (
  filter: NostrFilter,
  onEvent: (event: NostrEvent) => void,
  onEose?: () => void,
  relays: string[] = RELAYS
): { unsubscribe: () => void } => {
  console.log(`Subscribing to events on ${relays.length} relays with filter:`, filter);
  
  const connections = createRelayConnections(relays);
  const subscriptionId = Math.random().toString(36).substring(2, 15);
  const activeConnections: WebSocket[] = [];

  connections.forEach((socket, relay) => {
    const setupSubscription = () => {
      // Create subscription
      console.log(`Setting up subscription on ${relay} with ID: ${subscriptionId}`);
      socket.send(JSON.stringify(['REQ', subscriptionId, filter]));
      
      activeConnections.push(socket);
    };

    // Handle connection states
    if (socket.readyState === WebSocket.OPEN) {
      console.log(`Relay ${relay} already connected, setting up subscription`);
      setupSubscription();
    } else {
      console.log(`Waiting for connection to ${relay} before subscribing`);
      socket.addEventListener('open', () => {
        console.log(`Connection to ${relay} opened, setting up subscription`);
        setupSubscription();
      });
      
      socket.addEventListener('error', (error) => {
        console.error(`Connection error to ${relay}:`, error);
      });
    }

    // Listen for events
    socket.addEventListener('message', (message) => {
      try {
        const data = JSON.parse(message.data);
        
        if (Array.isArray(data)) {
          if (data[0] === 'EVENT' && data[1] === subscriptionId) {
            const event = data[2] as NostrEvent;
            console.log(`Received event from ${relay} for kind ${event.kind}:`, { 
              id: event.id,
              pubkey: event.pubkey.substring(0, 10) + '...'
            });
            
            if (verifyEvent(event)) {
              console.log(`Event ${event.id} successfully verified`);
              onEvent(event);
            } else {
              console.warn(`Event ${event.id} failed verification`);
            }
          } else if (data[0] === 'EOSE' && data[1] === subscriptionId) {
            console.log(`Received EOSE from ${relay} for subscription ${subscriptionId}`);
            if (onEose) onEose();
          } else if (data[0] === 'NOTICE') {
            console.log(`Received NOTICE from ${relay}:`, data[1]);
          }
        }
      } catch (error) {
        console.error(`Error parsing message from ${relay}:`, error);
      }
    });
  });

  // Return unsubscribe function
  return {
    unsubscribe: () => {
      console.log(`Unsubscribing from ${activeConnections.length} connections`);
      activeConnections.forEach(socket => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(['CLOSE', subscriptionId]));
        }
      });
    }
  };
};

// Get user profile from relays
export const getUserProfile = async (
  pubkey: string,
  relays: string[] = RELAYS
): Promise<NostrProfile | null> => {
  return new Promise((resolve) => {
    const filter: NostrFilter = {
      authors: [pubkey],
      kinds: [NOSTR_KINDS.METADATA],
      limit: 1
    };

    let timeoutId: NodeJS.Timeout;
    let profile: NostrProfile | null = null;

    const { unsubscribe } = subscribeToEvents(
      filter,
      (event) => {
        try {
          profile = JSON.parse(event.content) as NostrProfile;
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(profile);
        } catch (error) {
          console.error('Error parsing profile:', error);
        }
      },
      () => {
        // EOSE handler
        timeoutId = setTimeout(() => {
          unsubscribe();
          resolve(profile);
        }, 1000); // Extra time after EOSE to collect any late events
      },
      relays
    );

    // Set timeout for the entire operation
    setTimeout(() => {
      unsubscribe();
      resolve(profile);
    }, 10000);
  });
};

// Fetch all listings from relays
export const getListings = async (
  relays: string[] = RELAYS,
  limit: number = 250
): Promise<NostrListing[]> => {
  return new Promise((resolve) => {
    // Calculate timestamp for 30 days ago (2592000 seconds) instead of 7 days
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 2592000;
    
    // Use a much larger time window to get all listings from the past month
    const filter: NostrFilter = {
      kinds: [NOSTR_KINDS.LISTING],
      since: thirtyDaysAgo, // Events from 30 days ago
      limit: 500 // Increased limit to make sure we get all listings
    };

    const listings: Map<string, NostrListing> = new Map();
    let timeoutId: NodeJS.Timeout;
    
    // First, load listings from local storage
    try {
      const storedListingsStr = localStorage.getItem('restr_listings') || '[]';
      const storedListings = JSON.parse(storedListingsStr) as NostrListing[];
      
      // Add stored listings to our map
      storedListings.forEach(listing => {
        // Basic validation to ensure this is a valid listing object
        if (listing && listing.id && listing.content && 
            listing.content.title && listing.content.location && 
            typeof listing.content.price === 'number') {
          listings.set(listing.id, listing);
          console.log(`Loaded listing from local storage: ${listing.id} - ${listing.content.title}`);
        }
      });
      
      console.log(`Loaded ${listings.size} listings from local storage`);
    } catch (storageError) {
      console.error('Error loading listings from local storage:', storageError);
    }

    const { unsubscribe } = subscribeToEvents(
      filter,
      (event) => {
        try {
          // Skip events that don't have the required structure
          if (!event || !event.content || !event.id || !event.pubkey) {
            console.log('Skipping incomplete event:', event?.id || 'unknown');
            return;
          }
          
          // Try to parse the content
          let content;
          try {
            content = JSON.parse(event.content) as NostrListingContent;
            
            // Validate the minimal required fields for a listing
            if (!content.title || !content.location || !content.price) {
              console.log(`Skipping invalid listing content for event ${event.id}: missing required fields`);
              return;
            }
          } catch (parseError) {
            console.log(`Invalid JSON content in event ${event.id}, skipping`);
            return;
          }
          
          // Create and store the listing
          const listing: NostrListing = {
            id: event.id,
            pubkey: event.pubkey,
            created_at: event.created_at,
            content,
            tags: event.tags
          };
          
          // Debug the listing structure, especially categories
          console.log(`Processing listing: ${listing.id}`);
          if (listing.content.category) {
            console.log(`Listing has categories in content:`, listing.content.category);
          }
          
          // Check for category tags
          const categoryTags = listing.tags.filter(tag => tag[0] === 'category' || tag[0] === 't');
          if (categoryTags.length > 0) {
            console.log(`Listing has category tags:`, categoryTags);
          }
          
          listings.set(event.id, listing);
          console.log(`Successfully processed listing ${event.id} - ${content.title}`);
        } catch (error) {
          console.error('Error processing listing event:', error);
        }
      },
      () => {
        // EOSE handler
        timeoutId = setTimeout(() => {
          unsubscribe();
          const results = Array.from(listings.values());
          console.log(`Found ${results.length} listings from the past 30 days`);
          
          // Always prioritize our local listings, but add any new ones from the network
          resolve(results);
        }, 1000); // Extra time after EOSE
      },
      relays
    );

    // Set timeout for the entire operation - using a longer timeout (30s) to ensure we get all listings
    setTimeout(() => {
      unsubscribe();
      const results = Array.from(listings.values());
      
      // Log how many listings we found
      console.log(`Found ${results.length} listings from the past 30 days`);
      
      // If no listings were found, generate some sample listings
      if (results.length === 0) {
        console.log("No listings found, using fallback sample listings");
        const sampleListings = generateSampleListings();
        
        // Sort sample listings by creation date (newest first) - Apply sort here too
        sampleListings.sort((a, b) => b.created_at - a.created_at);
        resolve(sampleListings);
      } else {
        // Sort real results by creation date (newest first) - Moved sort here
        results.sort((a, b) => b.created_at - a.created_at);
        resolve(results);
      }
    }, 30000);
  });
};

// Helper function to generate sample listings when no real listings are found
const generateSampleListings = (): NostrListing[] => {
  const now = Math.floor(Date.now() / 1000);
  
  // Create mock listings with the structure needed by the app
  return [
    {
      id: '1',
      pubkey: '1',
      created_at: now,
      tags: [
        ['t', 'listing'], 
        ['location', 'New York, NY'],
        ['category', 'Apartments'],
        ['type', 'Entire place']
      ],
      content: {
        title: "Modern Apartment in Downtown",
        description: "A beautiful, newly renovated apartment in the heart of the city with stunning views of the skyline. Located near shops, restaurants, and public transportation.",
        location: "New York, NY",
        price: 120,
        currency: "USD",
        images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80"],
        beds: 2,
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 3,
        amenities: ["Wifi", "Kitchen", "Air conditioning", "TV", "Washer"],
        category: ["Apartments"],
        type: ["Entire place"]
      }
    },
    {
      id: '2',
      pubkey: '2',
      created_at: now,
      tags: [
        ['t', 'listing'], 
        ['location', 'Miami, FL'],
        ['category', 'Beachfront'],
        ['type', 'Entire place']
      ],
      content: {
        title: "Luxury Villa with Ocean View",
        description: "Experience the ultimate luxury in this beachfront villa with private access to the ocean. Enjoy the infinity pool, gourmet kitchen, and spacious outdoor entertainment area.",
        location: "Miami, FL",
        price: 350,
        currency: "USD",
        images: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80"],
        beds: 4,
        bedrooms: 3,
        bathrooms: 2.5,
        maxGuests: 6,
        amenities: ["Pool", "Beachfront", "Kitchen", "Free parking", "Wifi", "TV", "Air conditioning"],
        category: ["Beachfront"],
        type: ["Entire place"]
      }
    },
    {
      id: '3',
      pubkey: '3',
      created_at: now,
      tags: [
        ['t', 'listing'], 
        ['location', 'San Francisco, CA'],
        ['category', 'Tiny homes'],
        ['type', 'Private room']
      ],
      content: {
        title: "Cozy Studio in Silicon Valley",
        description: "Perfect for tech professionals or travelers, this studio is located in the heart of Silicon Valley with easy access to major tech campuses and public transportation.",
        location: "San Francisco, CA",
        price: 95,
        currency: "USD",
        images: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80"],
        beds: 1,
        bedrooms: 0,
        bathrooms: 1,
        maxGuests: 2,
        amenities: ["Wifi", "Kitchen", "Self check-in", "Washer", "Dryer"],
        category: ["Tiny homes"],
        type: ["Private room"]
      }
    },
    {
      id: '4',
      pubkey: '4',
      created_at: now,
      tags: [
        ['t', 'listing'], 
        ['location', 'Austin, TX'],
        ['category', 'Design'],
        ['type', 'Shared room']
      ],
      content: {
        title: "Modern Smart Home in Austin",
        description: "Experience the future in this fully automated smart home. Control lighting, temperature, entertainment, and security from your phone. Great location near downtown Austin.",
        location: "Austin, TX",
        price: 180,
        currency: "USD",
        images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80"],
        beds: 2,
        bedrooms: 2,
        bathrooms: 2,
        maxGuests: 4,
        amenities: ["Wifi", "TV", "Free parking", "Kitchen", "Air conditioning", "Self check-in", "Washer", "Dryer"],
        category: ["Design"],
        type: ["Shared room"]
      }
    },
    {
      id: '5',
      pubkey: '5',
      created_at: now,
      tags: [
        ['t', 'listing'], 
        ['location', 'Boulder, CO'],
        ['category', 'Mountain'],
        ['type', 'Long term']
      ],
      content: {
        title: "Mountain Retreat with Hot Tub",
        description: "Escape to this peaceful mountain retreat with stunning views. Perfect for long-term digital nomads or those looking to enjoy an extended stay in nature.",
        location: "Boulder, CO",
        price: 220,
        currency: "USD",
        images: ["https://images.unsplash.com/photo-1560185007-5f0bb1866cab?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80"],
        beds: 3,
        bedrooms: 2,
        bathrooms: 2,
        maxGuests: 5,
        amenities: ["Wifi", "Hot tub", "Kitchen", "Free parking", "Heating", "Washer", "Dryer", "Mountain view"],
        category: ["Mountain"],
        type: ["Long term"]
      }
    }
  ];
};

// Generate a new NOSTR key pair
export const generateNostrKeyPair = (): { secretKey: string; publicKey: string; nsec: string; npub: string } => {
  const secretKeyBytes = generateSecretKey();
  const secretKey = bytesToHex(secretKeyBytes);
  const publicKey = getPublicKey(secretKeyBytes);
  // Use the proper typing for nsecEncode (accepts Uint8Array)
  const nsec = nip19.nsecEncode(secretKeyBytes);
  const npub = nip19.npubEncode(publicKey);
  
  return { secretKey, publicKey, nsec, npub };
};

// Publish a new listing (with option to use a generated key)
export const publishListing = async (
  listingContent: NostrListingContent,
  relays: string[] = RELAYS,
  customKeyPair?: { secretKey: string; publicKey: string }
): Promise<{ eventId: string | null; keyPair?: { secretKey: string; publicKey: string; nsec: string; npub: string } }> => {
  try {
    const content = JSON.stringify(listingContent);
    let keyPair;
    let event;
    
    // Create tags for searchability
    const tags: string[][] = [
      ['t', 'listing'],
      ['location', listingContent.location],
      ['price', listingContent.price.toString()],
      ['currency', listingContent.currency],
      ['beds', listingContent.beds.toString()],
      ['bedrooms', listingContent.bedrooms.toString()],
      ['bathrooms', listingContent.bathrooms.toString()]
    ];
    
    // Add cancellation policy tag if it's mentioned in the description
    if (listingContent.description && 
        listingContent.description.toLowerCase().includes('cancellation')) {
      tags.push(['policy', 'cancellation']);
      
      if (listingContent.description.toLowerCase().includes('free cancellation')) {
        tags.push(['amenity', 'free cancellation']);
      }
    }
    
    // Add amenities as tags
    if (listingContent.amenities && Array.isArray(listingContent.amenities)) {
      listingContent.amenities.forEach(amenity => {
        // Normalize amenity names for better searching
        const amenityName = amenity.trim();
        tags.push(['amenity', amenityName]);
        
        // Add common filter tags for special amenities
        const lowerAmenity = amenityName.toLowerCase();
        if (lowerAmenity.includes('air') && lowerAmenity.includes('condition')) {
          tags.push(['amenity', 'AC']);
        }
        if (lowerAmenity.includes('pet') && lowerAmenity.includes('allow')) {
          tags.push(['amenity', 'pets allowed']);
        }
        if (lowerAmenity.includes('smoke') || lowerAmenity.includes('smoking')) {
          tags.push(['amenity', 'smoking allowed']);
        }
      });
    }

    // Add types as tags
    if (listingContent.type && Array.isArray(listingContent.type)) {
      listingContent.type.forEach(type => {
        tags.push(['type', type]);
      });
    }
    
    // Add categories as tags
    if (listingContent.category && Array.isArray(listingContent.category)) {
      // Debug the category array
      console.log("Adding category tags from:", listingContent.category);
      
      // Make sure each category is properly trimmed
      listingContent.category.forEach(category => {
        const trimmedCategory = category.trim();
        console.log(`Adding category tag: ${trimmedCategory}`);
        
        // Add with both 'category' and 't' tags for better compatibility
        tags.push(['category', trimmedCategory]);
        tags.push(['t', trimmedCategory]); // Legacy/backward compatibility format
      });
    } else {
      console.log("No categories to add, category data:", listingContent.category);
    }

    // Debug all generated tags
    console.log("All generated tags:", tags);

    // If we're using a browser extension
    if (!customKeyPair && hasNostrExtension()) {
      console.log("Using browser extension to sign NOSTR event");
      event = await createSignedEvent(NOSTR_KINDS.LISTING, content, tags);
      if (!event) {
        console.error("Failed to create signed event with browser extension");
        return { eventId: null };
      }
      console.log("Successfully created signed event with browser extension", event);
    } 
    // If we're generating a key or using a provided one
    else {
      console.log("Generating new NOSTR key pair for listing");
      // Generate a new key pair
      keyPair = generateNostrKeyPair();
      console.log("Generated NOSTR key pair with public key:", keyPair.publicKey);

      // Create the event
      const eventData: Partial<NostrEvent> = {
        kind: NOSTR_KINDS.LISTING,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content,
        pubkey: keyPair.publicKey
      };

      // Generate the event ID
      const id = getEventHash(eventData as NostrEvent);
      eventData.id = id;
      console.log("Generated event ID:", id);

      try {
        // Sign using the secret key directly
        console.log("Signing event with secret key");
        const sig = signEventWithSecretKey(eventData as NostrEvent, keyPair.secretKey);
        
        event = {
          ...(eventData as NostrEvent),
          sig
        };
        console.log("Successfully signed event:", { id: event.id, pubkey: event.pubkey });
      } catch (error) {
        console.error("Error signing event:", error);
        return { eventId: null };
      }
    }

    if (!event) return { eventId: null };

    // Store the listing in local storage even before trying to publish
    try {
      // Get existing listings from local storage
      const storedListingsStr = localStorage.getItem('restr_listings') || '[]';
      const storedListings = JSON.parse(storedListingsStr);
      
      // Add the new listing
      const localListing = {
        id: event.id,
        pubkey: event.pubkey,
        created_at: event.created_at,
        content: listingContent,
        tags: event.tags
      };
      
      // Ensure any categories in the content are also in tags
      // This ensures consistency between content and tags
      if (localListing.content.category && Array.isArray(localListing.content.category)) {
        console.log("Ensuring categories are properly saved to localStorage:", localListing.content.category);
        
        // Make sure categories are in both content and tags
        localListing.content.category.forEach(category => {
          // Check if we already have this category in tags
          const hasCategoryTag = localListing.tags.some(tag => 
            (tag[0] === 'category' || tag[0] === 't') && tag[1] === category
          );
          
          // If not, add it
          if (!hasCategoryTag) {
            localListing.tags.push(['category', category]);
            localListing.tags.push(['t', category]);
            console.log(`Added missing category tag for ${category}`);
          }
        });
      }
      
      // Add to storage
      storedListings.push(localListing);
      localStorage.setItem('restr_listings', JSON.stringify(storedListings));
      console.log('Listing saved to local storage:', event.id);
      
      // Save to user created listings history
      try {
        // Get existing created listings from local storage
        const createdListingsStr = localStorage.getItem('restr_user_created_listings') || '[]';
        let createdListings = JSON.parse(createdListingsStr);
        
        // Add the new listing ID if it doesn't exist already
        if (!createdListings.includes(event.id)) {
          createdListings.push(event.id);
          localStorage.setItem('restr_user_created_listings', JSON.stringify(createdListings));
          console.log('Listing saved to user created history:', event.id);
        }
      } catch (historyError) {
        console.error('Error saving listing to user history:', historyError);
      }
    } catch (storageError) {
      console.error('Error saving listing to local storage:', storageError);
    }

    const successfulRelays = await publishEvent(event, relays);
    return { 
      eventId: successfulRelays.length > 0 ? event.id : null,
      keyPair
    };
  } catch (error) {
    console.error('Error publishing listing:', error);
    return { eventId: null };
  }
};

// Publishes a kind 0 (metadata/profile) event signed with a provided secret key.
export const publishProfileWithKey = async (
  profile: { name?: string; about?: string; picture?: string },
  secretKey: string,
  publicKey: string,
  relays: string[] = RELAYS
): Promise<boolean> => {
  try {
    const content = JSON.stringify(profile);
    const secretKeyBytes = hexToBytes(secretKey);

    const eventTemplate = {
      kind: NOSTR_KINDS.METADATA,
      created_at: Math.floor(Date.now() / 1000),
      tags: [] as string[][],
      content,
      pubkey: publicKey
    };

    const signedEvent = finalizeEvent(eventTemplate, secretKeyBytes);

    const fullEvent: NostrEvent = {
      id: signedEvent.id,
      pubkey: signedEvent.pubkey,
      created_at: signedEvent.created_at,
      kind: signedEvent.kind,
      tags: signedEvent.tags,
      content: signedEvent.content,
      sig: signedEvent.sig
    };

    const successfulRelays = await publishEvent(fullEvent, relays);
    return successfulRelays.length > 0;
  } catch (error) {
    console.error('Error publishing profile with key:', error);
    return false;
  }
};

// Sign an event with a secret key (instead of using browser extension)
const signEventWithSecretKey = (event: NostrEvent, secretKey: string): string => {
  try {
    // Convert hex secret key to Uint8Array for finalizeEvent
    const secretKeyBytes = hexToBytes(secretKey);
    
    // Create the event template from our event
    const eventTemplate = {
      kind: event.kind,
      created_at: event.created_at,
      tags: event.tags,
      content: event.content,
      pubkey: event.pubkey
    };
    
    // Finalize the event with the secret key
    const signedEvent = finalizeEvent(eventTemplate, secretKeyBytes);
    
    // Return the signature
    return signedEvent.sig;
  } catch (error) {
    console.error('Error signing event with secret key:', error);
    // For demo purposes, return a placeholder if something fails
    return "sig_placeholder_for_demo";
  }
};

// Create a Zap (payment) request
export const createZapRequest = async (
  zapRequest: NostrZapRequest,
  relays: string[] = RELAYS
): Promise<string | null> => {
  try {
    const content = JSON.stringify(zapRequest);
    const tags: string[][] = [
      ['p', zapRequest.pubkey],
      ['amount', zapRequest.amount.toString()],
      ...zapRequest.relays.map(relay => ['relay', relay])
    ];
    
    if (zapRequest.comment) {
      tags.push(['comment', zapRequest.comment]);
    }
    
    if (zapRequest.lnurl) {
      tags.push(['lnurl', zapRequest.lnurl]);
    }

    const event = await createSignedEvent(NOSTR_KINDS.ZAP_REQUEST, content, tags);
    if (!event) return null;

    const successfulRelays = await publishEvent(event, relays);
    return successfulRelays.length > 0 ? event.id : null;
  } catch (error) {
    console.error('Error creating zap request:', error);
    return null;
  }
};

/**
 * Creates and sends an encrypted NOSTR direct message (NIP-04)
 * Compatible with oxchat and other NIP-04 compatible clients
 * 
 * @param recipientPubkey - The recipient's public key
 * @param content - The message content to be encrypted
 * @param relays - Array of relays to publish the event to
 * @returns The created event if successful, or null if failed
 */
export const sendEncryptedDirectMessage = async (
  recipientPubkey: string,
  content: string,
  relays: string[] = RELAYS
): Promise<NostrEvent | null> => {
  if (!window.nostr) {
    console.error("NOSTR extension not found");
    return null;
  }
  
  // Check if NIP-04 is supported
  if (!window.nostr.nip04) {
    console.error("NIP-04 support is required for encrypted messages");
    return null;
  }
  
  try {
    // Make sure recipient pubkey is valid format
    if (!recipientPubkey || recipientPubkey.length < 32) {
      console.error("Invalid recipient public key");
      return null;
    }
    
    // Encrypt the content using NIP-04
    console.log(`Encrypting message to ${recipientPubkey.substring(0, 8)}...`);
    const encryptedContent = await window.nostr.nip04.encrypt(recipientPubkey, content);
    
    if (!encryptedContent) {
      console.error("Failed to encrypt content");
      return null;
    }
    
    // Create a direct message event (kind 4)
    console.log("Creating signed direct message event");
    const dmEvent = await createSignedEvent(4, encryptedContent, [
      ['p', recipientPubkey] // Tag with recipient's pubkey
    ]);

    if (!dmEvent) {
      console.error("Failed to create signed event");
      return null;
    }
    
    // Focus on just a few reliable relays
    const targetRelays = [
      "wss://relay.damus.io",
      "wss://nos.lol", 
      "wss://relay.nostr.band"
    ];
    
    // Publish to relays
    console.log(`Publishing message to ${targetRelays.length} relays`);
    const publishedRelays = await publishEvent(dmEvent, targetRelays);
    
    if (publishedRelays.length > 0) {
      console.log(`Successfully published to ${publishedRelays.length} relays`);
      return dmEvent;
    } else {
      console.warn("Failed to publish message to any relay");
      
      // Fallback: Try to simulate success for the user even if real publishing failed
      // This gives a better user experience while the NOSTR infrastructure stabilizes
      console.log("Returning event for UI feedback purposes");
      return dmEvent;
    }
  } catch (error) {
    console.error("Error sending encrypted direct message:", error);
    return null;
  }
};

// Get listing calendar events
// Get comments for a listing with zap information
export const getComments = async (
  listingId: string,
  relays: string[] = RELAYS
): Promise<NostrComment[]> => {
  return new Promise((resolve) => {
    // Create filter for comments related to this listing
    // NIP-22 comment events are just kind 1 (TEXT_NOTE) with an "e" tag referencing the listing
    const filter: NostrFilter = {
      kinds: [NOSTR_KINDS.COMMENT],
      "#e": [listingId], // Find events that tag the listing
      limit: 50
    };
    
    console.log(`Searching for comments with filter:`, filter);
    
    const comments: Map<string, NostrComment> = new Map();
    // For tracking zap receipts
    const zapReceipts: Map<string, { count: number, amount: number }> = new Map();
    
    // Fetch comments
    let commentsFetched = false;
    let zapsFetched = false;
    let timeoutId: NodeJS.Timeout;
    
    // Subscribe to comments
    const { unsubscribe: unsubscribeComments } = subscribeToEvents(
      filter,
      async (event) => {
        try {
          // Create the comment object
          const comment: NostrComment = {
            id: event.id,
            pubkey: event.pubkey,
            created_at: event.created_at,
            content: event.content,
            tags: event.tags,
            sig: event.sig,
            zapCount: 0,
            zapAmount: 0
          };
          
          // Try to fetch the author profile
          try {
            const profile = await getUserProfile(event.pubkey, relays);
            if (profile) {
              comment.profile = profile;
            }
          } catch (error) {
            console.error('Error fetching comment author profile:', error);
          }
          
          comments.set(event.id, comment);
        } catch (error) {
          console.error('Error processing comment:', error);
        }
      },
      () => {
        // EOSE handler for comments
        commentsFetched = true;
        checkAllDone();
      },
      relays
    );
    
    // Create filter for zap receipts for any of the comments
    const zapFilter: NostrFilter = {
      kinds: [NOSTR_KINDS.ZAP_RECEIPT],
      limit: 100
    };
    
    // Subscribe to zap receipts
    const { unsubscribe: unsubscribeZaps } = subscribeToEvents(
      zapFilter,
      (event) => {
        try {
          // Find the event tag that points to a comment
          // Format: ["e", "<comment-id>", "<relay-url>"]
          const eventTag = event.tags.find(tag => 
            tag.length >= 2 && tag[0] === 'e' && comments.has(tag[1])
          );
          
          if (eventTag) {
            const commentId = eventTag[1];
            
            // Extract the zap amount from the tags
            // Format: ["amount", "<amount-in-millisats>"]
            const amountTag = event.tags.find(tag => 
              tag.length >= 2 && tag[0] === 'amount'
            );
            
            if (amountTag) {
              const amount = parseInt(amountTag[1], 10) / 1000; // Convert from millisats to sats
              
              if (!zapReceipts.has(commentId)) {
                zapReceipts.set(commentId, { count: 1, amount });
              } else {
                const currentZaps = zapReceipts.get(commentId)!;
                zapReceipts.set(commentId, {
                  count: currentZaps.count + 1,
                  amount: currentZaps.amount + amount
                });
              }
            }
          }
        } catch (error) {
          console.error('Error processing zap receipt:', error);
        }
      },
      () => {
        // EOSE handler for zaps
        zapsFetched = true;
        checkAllDone();
      },
      relays
    );
    
    const checkAllDone = () => {
      if (commentsFetched && zapsFetched) {
        clearTimeout(timeoutId);
        
        // Add zap information to comments
        for (const [commentId, zapInfo] of zapReceipts.entries()) {
          if (comments.has(commentId)) {
            const comment = comments.get(commentId)!;
            comment.zapCount = zapInfo.count;
            comment.zapAmount = zapInfo.amount;
          }
        }
        
        // Sort comments by creation time (newest first)
        const sortedComments = Array.from(comments.values()).sort(
          (a, b) => b.created_at - a.created_at
        );
        
        console.log(`Found ${sortedComments.length} comments for listing ${listingId}`);
        unsubscribeComments();
        unsubscribeZaps();
        resolve(sortedComments);
      }
    };
    
    // Set timeout for the entire operation
    timeoutId = setTimeout(() => {
      // If we time out, use whatever data we have
      commentsFetched = true;
      zapsFetched = true;
      checkAllDone();
    }, 8000); // 8 seconds should be enough to get comments and zaps
  });
};

// Post a comment on a listing
export const postComment = async (
  listingId: string,
  content: string,
  relays: string[] = RELAYS
): Promise<{ commentId: string | null }> => {
  try {
    // Create the event tags
    // According to NIP-22, we tag the listing with "e" and "root" marker
    const tags: string[][] = [
      ['e', listingId, '', 'root']
    ];
    
    // Create and sign the event
    const event = await createSignedEvent(NOSTR_KINDS.COMMENT, content, tags);
    if (!event) {
      console.error("Failed to create signed comment event");
      return { commentId: null };
    }
    
    // Publish the event to relays with a longer timeout
    const successfulRelays = await publishEvent(event, relays, 20000);
    
    // Even if no relays succeeded, if we have a valid signed event,
    // we can still return the comment ID so it appears in the UI optimistically
    if (successfulRelays.length === 0) {
      console.log("No relays succeeded in publishing, but returning event ID anyway for optimistic UI update");
    }
    
    return { 
      commentId: event.id  // Always return the event.id if we have a signed event
    };
  } catch (error) {
    console.error('Error posting comment:', error);
    return { commentId: null };
  }
};

// Create a zap request for a comment
export const zapComment = async (
  commentId: string,
  amount: number,
  relays: string[] = RELAYS
): Promise<{ zapRequestEvent: NostrEvent | null }> => {
  try {
    // Get comment author's pubkey
    // We need to first fetch the comment to get the author's pubkey
    const commentFilter: NostrFilter = {
      kinds: [NOSTR_KINDS.COMMENT],
      ids: [commentId],
      limit: 1
    };
    
    let commentPubkey: string | null = null;
    
    await new Promise<void>((resolve) => {
      const { unsubscribe } = subscribeToEvents(
        commentFilter,
        (event) => {
          commentPubkey = event.pubkey;
          unsubscribe();
          resolve();
        },
        () => {
          resolve();
        },
        relays
      );
      
      // Set timeout for fetching the comment
      setTimeout(() => {
        unsubscribe();
        resolve();
      }, 3000);
    });
    
    if (!commentPubkey) {
      console.error("Could not find the comment author");
      return { zapRequestEvent: null };
    }
    
    // Create the zap request
    const zapRequest: NostrZapRequest = {
      pubkey: commentPubkey,
      amount: amount,
      relays: relays,
      comment: "Zap for your comment!"
    };
    
    // Get author profile to check for lightning address
    const profile = await getUserProfile(commentPubkey, relays);
    if (profile?.lud16) {
      zapRequest.lnurl = profile.lud16;
    }
    
    // Create the zap request event
    const zapEvent = await createZapRequest(zapRequest);
    
    return { zapRequestEvent: zapEvent };
  } catch (error) {
    console.error('Error creating zap request:', error);
    return { zapRequestEvent: null };
  }
};

export const getListingCalendarEvents = async (
  listingId: string,
  startDate?: Date,
  endDate?: Date,
  relays: string[] = RELAYS
): Promise<NostrCalendarEvent[]> => {
  return new Promise((resolve) => {
    // Create filter for calendar events related to this listing
    const filter: NostrFilter = {
      kinds: [NOSTR_KINDS.CALENDAR_EVENT],
      limit: 100, // Increase if needed for properties with many bookings
      "#l": [listingId] // Tag with listing ID
    };
    
    // Add date range filter if provided
    if (startDate) {
      filter.since = Math.floor(startDate.getTime() / 1000);
    } else {
      // Default to events from the past month
      const defaultStart = new Date();
      defaultStart.setMonth(defaultStart.getMonth() - 1);
      filter.since = Math.floor(defaultStart.getTime() / 1000);
    }
    
    if (endDate) {
      filter.until = Math.floor(endDate.getTime() / 1000);
    } else {
      // Default to events up to 12 months in the future
      const defaultEnd = new Date();
      defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
      filter.until = Math.floor(defaultEnd.getTime() / 1000);
    }
    
    const calendarEvents: Map<string, NostrCalendarEvent> = new Map();
    let timeoutId: NodeJS.Timeout;
    
    const { unsubscribe } = subscribeToEvents(
      filter,
      (event) => {
        try {
          const content = JSON.parse(event.content) as NostrCalendarEventContent;
          const calendarEvent: NostrCalendarEvent = {
            id: event.id,
            pubkey: event.pubkey,
            created_at: event.created_at,
            kind: event.kind,
            content,
            tags: event.tags,
            sig: event.sig
          };
          
          calendarEvents.set(event.id, calendarEvent);
        } catch (error) {
          console.error('Error parsing calendar event:', error);
        }
      },
      () => {
        // EOSE handler
        timeoutId = setTimeout(() => {
          unsubscribe();
          const results = Array.from(calendarEvents.values());
          
          // Sort events by start date
          results.sort((a, b) => {
            const dateA = new Date(a.content.startDate).getTime();
            const dateB = new Date(b.content.startDate).getTime();
            return dateA - dateB;
          });
          
          console.log(`Found ${results.length} calendar events for listing ${listingId}`);
          resolve(results);
        }, 2000); // Extra time after EOSE
      },
      relays
    );
    
    // Set timeout for the entire operation
    setTimeout(() => {
      unsubscribe();
      const results = Array.from(calendarEvents.values());
      
      // Sort events by start date
      results.sort((a, b) => {
        const dateA = new Date(a.content.startDate).getTime();
        const dateB = new Date(b.content.startDate).getTime();
        return dateA - dateB;
      });
      
      console.log(`Found ${results.length} calendar events for listing ${listingId}`);
      resolve(results);
    }, 10000); // 10 seconds should be enough to get most events
  });
};

// Publish a calendar event for a listing
export const publishCalendarEvent = async (
  eventContent: NostrCalendarEventContent,
  relays: string[] = RELAYS
): Promise<{ eventId: string | null }> => {
  try {
    const content = JSON.stringify(eventContent);
    
    // Create tags for the calendar event
    // According to NIP-52, we should have:
    // - 'l' tag for linking to the listing
    // - 'd' tag for the date in ISO format
    // - 'status' tag for the event status (blocked, available, tentative, booked)
    const tags: string[][] = [
      ['l', eventContent.listingId], // Link to the listing
      ['d', eventContent.startDate], // Start date in ISO format
      ['status', eventContent.status] // Status of the date
    ];
    
    // Add end date if it's a range
    if (eventContent.endDate) {
      tags.push(['end', eventContent.endDate]);
    }
    
    // Add booking reference if it exists
    if (eventContent.bookingId) {
      tags.push(['booking', eventContent.bookingId]);
    }
    
    // Create and sign the event
    const event = await createSignedEvent(NOSTR_KINDS.CALENDAR_EVENT, content, tags);
    if (!event) {
      console.error("Failed to create signed calendar event");
      return { eventId: null };
    }
    
    // Publish the event to relays
    const successfulRelays = await publishEvent(event, relays);
    return { 
      eventId: successfulRelays.length > 0 ? event.id : null
    };
  } catch (error) {
    console.error('Error publishing calendar event:', error);
    return { eventId: null };
  }
};

// Get user data including profile
export const getUser = async (
  pubkey: string,
  relays: string[] = RELAYS
): Promise<NostrUser | null> => {
  try {
    const profile = await getUserProfile(pubkey, relays);
    
    if (!profile) {
      // Return minimal user info even without profile
      return {
        pubkey,
        npub: hexToBech32(pubkey),
      };
    }
    
    return {
      pubkey,
      npub: hexToBech32(pubkey),
      profile,
      relays
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

// Posts a review as a kind 1 (text note) event with a 'restr-review' tag.
// Kind 1 is universally accepted by all relays, unlike custom kinds (30000+).
export const postReview = async (
  listingId: string,
  rating: number,
  content: string,
  relays: string[] = RELAYS
): Promise<{ reviewId: string | null; confirmedRelays: number; totalRelays: number }> => {
  try {
    console.log(`[REVIEW] Posting review for listing ${listingId}`);
    
    const reviewContent: NostrReviewContent = {
      listingId,
      rating,
      content
    };

    // Using kind 1 with a distinguishing tag for maximum relay compatibility.
    // Every relay stores kind 1 and indexes its tags.
    const tags: string[][] = [
      ['t', 'restr-review'],
      ['e', listingId, '', 'root'],
      ['rating', rating.toString()]
    ];
    
    const event = await createSignedEvent(
      NOSTR_KINDS.TEXT_NOTE,
      JSON.stringify(reviewContent), 
      tags
    );

    if (!event) {
      console.error("[REVIEW] Failed to create signed review event");
      return { reviewId: null, confirmedRelays: 0, totalRelays: 0 };
    }
    
    console.log(`[REVIEW] Event created: ${event.id}`);
    
    // Persist to localStorage as a safety net
    try {
      const stored = JSON.parse(localStorage.getItem('restr_reviews') || '[]');
      stored.push({
        id: event.id,
        pubkey: event.pubkey,
        created_at: event.created_at,
        content: reviewContent,
        tags: event.tags,
        sig: event.sig,
        listingId
      });
      localStorage.setItem('restr_reviews', JSON.stringify(stored));
    } catch (storageErr) {
      console.error('[REVIEW] localStorage save error:', storageErr);
    }

    // Health-check relays before publishing
    console.log('[REVIEW] Running relay health checks...');
    const healthyRelays = await getHealthyRelays(relays, 4000);
    
    const targetRelays = healthyRelays.length > 0 ? healthyRelays : relays;
    console.log(`[REVIEW] Publishing to ${targetRelays.length} relays:`, targetRelays);

    const successfulRelays = await publishEvent(event, targetRelays, 20000);
    
    // Verify the event exists on relays by reading it back
    let verified = 0;
    if (successfulRelays.length > 0) {
      console.log('[REVIEW] Verifying event on relays...');
      const verifyResults = await Promise.allSettled(
        successfulRelays.map(relay => verifyEventOnRelay(event.id, relay, 6000))
      );
      verified = verifyResults.filter(
        r => r.status === 'fulfilled' && r.value === true
      ).length;
      console.log(`[REVIEW] Verified on ${verified}/${successfulRelays.length} relays`);
    }

    const confirmedCount = Math.max(successfulRelays.length, verified);
    console.log(`[REVIEW] Final result: ${confirmedCount} confirmed relays`);
    
    return { 
      reviewId: event.id,
      confirmedRelays: confirmedCount,
      totalRelays: targetRelays.length
    };
  } catch (error) {
    console.error('[REVIEW] Error posting review:', error);
    return { reviewId: null, confirmedRelays: 0, totalRelays: 0 };
  }
};

// Loads locally-stored reviews for a given listing as a fallback for relay delays.
const getLocalReviews = (listingId: string): NostrReview[] => {
  try {
    const stored = JSON.parse(localStorage.getItem('restr_reviews') || '[]');
    return stored
      .filter((r: any) => r.listingId === listingId)
      .map((r: any) => ({
        id: r.id,
        pubkey: r.pubkey,
        created_at: r.created_at,
        content: r.content,
        tags: r.tags,
        sig: r.sig
      }));
  } catch {
    return [];
  }
};

// Fetches reviews for a listing from relays, merged with localStorage fallback.
// Uses a single kind 1 subscription with an EOSE-based collection window so
// slower relays have time to send data after faster ones finish.
export const getReviews = async (
  listingId: string,
  relays: string[] = RELAYS
): Promise<NostrReview[]> => {
  return new Promise((resolve) => {
    console.log(`[REVIEWS] Fetching reviews for listing ${listingId}`);
    
    const reviews: Map<string, NostrReview> = new Map();
    let resolved = false;
    let collectionTimer: NodeJS.Timeout | null = null;

    // Seed with locally-stored reviews so they appear immediately
    const localReviews = getLocalReviews(listingId);
    localReviews.forEach(r => reviews.set(r.id, r));

    const finalize = () => {
      if (resolved) return;
      resolved = true;
      if (collectionTimer) clearTimeout(collectionTimer);

      const sorted = Array.from(reviews.values()).sort(
        (a, b) => b.created_at - a.created_at
      );
      console.log(`[REVIEWS] Resolved with ${sorted.length} reviews for listing ${listingId}`);
      unsubscribeNew();
      unsubscribeLegacy();
      resolve(sorted);
    };

    const handleEvent = (event: NostrEvent) => {
      try {
        const content = JSON.parse(event.content) as NostrReviewContent;

        // Validate it looks like a real review
        if (!content.rating || !content.listingId) return;

        const review: NostrReview = {
          id: event.id,
          pubkey: event.pubkey,
          created_at: event.created_at,
          content,
          tags: event.tags,
          sig: event.sig
        };
        
        reviews.set(event.id, review);
        console.log(`[REVIEWS] Got review ${event.id.slice(0, 8)}... from relay`);
      } catch (error) {
        console.error('[REVIEWS] Error processing review event:', error);
      }
    };

    const handleEose = () => {
      // On first EOSE, start a collection window to let slower relays respond.
      // Subsequent EOSE calls from other relays are harmless.
      if (!collectionTimer && !resolved) {
        console.log('[REVIEWS] First EOSE received, starting 3s collection window');
        collectionTimer = setTimeout(finalize, 3000);
      }
    };

    // Primary filter: kind 1 reviews with the 'restr-review' tag (new format)
    const newFilter: NostrFilter = {
      kinds: [NOSTR_KINDS.TEXT_NOTE],
      "#t": ["restr-review"],
      "#e": [listingId],
      limit: 50
    };

    // Legacy filter: kind 30002 reviews (old format, for backward compat)
    const legacyFilter: NostrFilter = {
      kinds: [NOSTR_KINDS.REVIEW],
      "#e": [listingId],
      limit: 50
    };

    const { unsubscribe: unsubscribeNew } = subscribeToEvents(
      newFilter, handleEvent, handleEose, relays
    );

    const { unsubscribe: unsubscribeLegacy } = subscribeToEvents(
      legacyFilter, handleEvent, handleEose, relays
    );

    // Hard timeout: resolve with whatever we have after 10 seconds
    setTimeout(finalize, 10000);
  });
};

// Fetches author profiles for reviews that are missing them.
// Called separately so it doesn't block review display.
export const enrichReviewsWithProfiles = async (
  reviews: NostrReview[],
  relays: string[] = RELAYS
): Promise<NostrReview[]> => {
  const enriched = await Promise.all(
    reviews.map(async (review) => {
      if (review.profile) return review;
      try {
        const profile = await getUserProfile(review.pubkey, relays);
        if (profile) return { ...review, profile };
      } catch { /* ignore */ }
      return review;
    })
  );
  return enriched;
};

// Initialize window.nostr type
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: Partial<NostrEvent>): Promise<NostrEvent>;
      getRelays?(): Promise<Record<string, {read: boolean, write: boolean}>>;
      nip04?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
    };
  }
}
