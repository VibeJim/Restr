import { getEventHash, getPublicKey } from 'nostr-tools/pure';
import { verifyEvent as verifyNostrEvent, validateEvent } from 'nostr-tools/pure';
import * as nip19 from 'nostr-tools/nip19';
import { RELAYS, NOSTR_KINDS } from './constants';
import type { 
  NostrEvent, 
  NostrFilter,
  NostrListing,
  NostrListingContent,
  NostrProfile,
  NostrUser,
  NostrZapRequest
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
export const hexToBech32 = (hex: string, prefix: string = 'npub'): string => {
  try {
    // Using the newer API format for nip19
    return nip19.npubEncode(hex);
  } catch (error) {
    console.error('Error converting hex to bech32:', error);
    return hex;
  }
};

// Convert an npub to a hex pubkey
export const bech32ToHex = (bech32: string): string | null => {
  try {
    const { data } = nip19.decode(bech32);
    return data.toString();
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
    return signedEvent;
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

  relays.forEach(relay => {
    try {
      const socket = new WebSocket(relay);
      connections.set(relay, socket);
    } catch (error) {
      console.error(`Failed to connect to relay: ${relay}`, error);
    }
  });

  return connections;
};

// Send an event to relays
export const publishEvent = async (
  event: NostrEvent,
  relays: string[] = RELAYS
): Promise<string[]> => {
  const successfulRelays: string[] = [];
  const connections = createRelayConnections(relays);

  for (const [relay, socket] of connections.entries()) {
    try {
      // Wait for the connection to open
      if (socket.readyState !== WebSocket.OPEN) {
        await new Promise<void>((resolve, reject) => {
          const onOpen = () => {
            socket.removeEventListener('open', onOpen);
            socket.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = (error: Event) => {
            socket.removeEventListener('open', onOpen);
            socket.removeEventListener('error', onError);
            reject(new Error(`Failed to connect to relay: ${relay}`));
          };
          
          socket.addEventListener('open', onOpen);
          socket.addEventListener('error', onError);
          
          // Add timeout
          setTimeout(() => {
            socket.removeEventListener('open', onOpen);
            socket.removeEventListener('error', onError);
            reject(new Error(`Connection to relay timed out: ${relay}`));
          }, 5000);
        });
      }

      // Send the event
      socket.send(JSON.stringify(['EVENT', event]));

      // Wait for confirmation (OK message)
      const success = await new Promise<boolean>((resolve) => {
        const onMessage = (message: MessageEvent) => {
          try {
            const data = JSON.parse(message.data);
            if (Array.isArray(data) && data[0] === 'OK' && data[1] === event.id && data[2]) {
              socket.removeEventListener('message', onMessage);
              resolve(true);
            }
          } catch (error) {
            // Ignore parsing errors
          }
        };

        socket.addEventListener('message', onMessage);

        // Timeout for confirmation
        setTimeout(() => {
          socket.removeEventListener('message', onMessage);
          resolve(false);
        }, 5000);
      });

      if (success) {
        successfulRelays.push(relay);
      }
    } catch (error) {
      console.error(`Error publishing to relay ${relay}:`, error);
    } finally {
      // Close the connection
      setTimeout(() => {
        try {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close();
          }
        } catch (e) {
          // Ignore closing errors
        }
      }, 1000);
    }
  }

  return successfulRelays;
};

// Subscribe to events from relays
export const subscribeToEvents = (
  filter: NostrFilter,
  onEvent: (event: NostrEvent) => void,
  onEose?: () => void,
  relays: string[] = RELAYS
): { unsubscribe: () => void } => {
  const connections = createRelayConnections(relays);
  const subscriptionId = Math.random().toString(36).substring(2, 15);
  const activeConnections: WebSocket[] = [];

  connections.forEach((socket, relay) => {
    const setupSubscription = () => {
      // Create subscription
      socket.send(JSON.stringify(['REQ', subscriptionId, filter]));
      
      activeConnections.push(socket);
    };

    // Handle connection states
    if (socket.readyState === WebSocket.OPEN) {
      setupSubscription();
    } else {
      socket.addEventListener('open', setupSubscription);
    }

    // Listen for events
    socket.addEventListener('message', (message) => {
      try {
        const data = JSON.parse(message.data);
        if (Array.isArray(data) && data[0] === 'EVENT' && data[1] === subscriptionId) {
          const event = data[2] as NostrEvent;
          if (verifyEvent(event)) {
            onEvent(event);
          }
        } else if (Array.isArray(data) && data[0] === 'EOSE' && data[1] === subscriptionId) {
          if (onEose) onEose();
        }
      } catch (error) {
        // Ignore parsing errors
      }
    });
  });

  // Return unsubscribe function
  return {
    unsubscribe: () => {
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
  limit: number = 100
): Promise<NostrListing[]> => {
  return new Promise((resolve) => {
    const filter: NostrFilter = {
      kinds: [NOSTR_KINDS.LISTING],
      limit
    };

    const listings: Map<string, NostrListing> = new Map();
    let timeoutId: NodeJS.Timeout;

    const { unsubscribe } = subscribeToEvents(
      filter,
      (event) => {
        try {
          const content = JSON.parse(event.content) as NostrListingContent;
          const listing: NostrListing = {
            id: event.id,
            pubkey: event.pubkey,
            created_at: event.created_at,
            content,
            tags: event.tags
          };
          
          listings.set(event.id, listing);
        } catch (error) {
          console.error('Error parsing listing:', error);
        }
      },
      () => {
        // EOSE handler
        timeoutId = setTimeout(() => {
          unsubscribe();
          resolve(Array.from(listings.values()));
        }, 1000); // Extra time after EOSE
      },
      relays
    );

    // Set timeout for the entire operation
    setTimeout(() => {
      unsubscribe();
      resolve(Array.from(listings.values()));
    }, 15000);
  });
};

// Publish a new listing
export const publishListing = async (
  listingContent: NostrListingContent,
  relays: string[] = RELAYS
): Promise<string | null> => {
  try {
    const content = JSON.stringify(listingContent);
    
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
    
    // Add amenities as tags
    if (listingContent.amenities && Array.isArray(listingContent.amenities)) {
      listingContent.amenities.forEach(amenity => {
        tags.push(['amenity', amenity]);
      });
    }

    const event = await createSignedEvent(NOSTR_KINDS.LISTING, content, tags);
    if (!event) return null;

    const successfulRelays = await publishEvent(event, relays);
    return successfulRelays.length > 0 ? event.id : null;
  } catch (error) {
    console.error('Error publishing listing:', error);
    return null;
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
