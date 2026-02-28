import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  getCurrentUserPubkey, 
  getUserProfile, 
  hasNostrExtension, 
  hexToBech32, 
  bech32ToHex 
} from '@/lib/nostr';
import { NostrProfile, NostrUser } from '@/types/nostr';
import { DEFAULT_PROFILE_IMAGE, RELAYS, NOSTR_KINDS } from '@/lib/constants';

interface NostrContextType {
  user: NostrUser | null;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => Promise<boolean>;
  connectWithNip07: () => Promise<boolean>;
  connectWithNIP46: (pubkey: string) => Promise<boolean>;
  checkForNip07Login: () => Promise<boolean>;
  disconnect: () => void;
}

const NostrContext = createContext<NostrContextType>({
  user: null,
  isConnected: false,
  isLoading: true,
  connect: async () => false,
  connectWithNip07: async () => false,
  connectWithNIP46: async () => false,
  checkForNip07Login: async () => false,
  disconnect: () => {},
});

export const useNostr = () => useContext(NostrContext);

interface NostrProviderProps {
  children: ReactNode;
}

export const NostrProvider = ({ children }: NostrProviderProps) => {
  const [user, setUser] = useState<NostrUser | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Helper function to convert string to valid login method
  const safeLoginMethod = (method: string | null): 'nip07' | 'nip46' | 'unknown' => {
    if (method === 'nip07' || method === 'nip46') {
      return method;
    }
    return 'unknown';
  };

  // Set up WebSocket connection for mobile login
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;
  
    const connectWebSocket = () => {
      // Connect to a relay for NIP-46 signaling
      console.log('[WS-DEBUG] Connecting to WebSocket relay for NIP-46...');
      ws = new WebSocket('wss://relay.damus.io');
      
      ws.onopen = () => {
        console.log('[WS-DEBUG] WebSocket connected for NIP-46 remote signing');
        
        // Get the current session secret
        const secret = localStorage.getItem('nostr_connect_session');
        if (secret) {
          // Subscribe to NIP-46 auth events
          const subscriptionId = Math.random().toString(36).substring(2, 15);
          
          // Get the challenge if we stored one
          const challenge = localStorage.getItem('nostr_connect_challenge');
          console.log('[WS-DEBUG] Retrieved stored values - Secret exists:', !!secret, 'Challenge exists:', !!challenge);
          
          // Create a filter for NIP-46 authentication events
          const filter = {
            kinds: [NOSTR_KINDS.REMOTE_SIGNING], // NIP-46 remote signing kind
            // Look for relevant tags
            '#secret': [secret]
          };
          
          console.log('[WS-DEBUG] Setting up NIP-46 subscription with filter:', filter);
          ws?.send(JSON.stringify(['REQ', subscriptionId, filter]));
          
          // Also subscribe to a broader filter for compatibility with different implementations
          const fallbackSubId = Math.random().toString(36).substring(2, 15);
          
          // Create a fallback filter that matches all possible NIP-46 connection events
          const fallbackFilter: any = { 
            kinds: [NOSTR_KINDS.REMOTE_SIGNING]
          };
          
          // Check for commonly used tags in different Amber versions
          fallbackFilter['#method'] = ['connect', 'auth'];
          
          console.log('[WS-DEBUG] Setting up fallback subscription with filter:', fallbackFilter);
          ws?.send(JSON.stringify(['REQ', fallbackSubId, fallbackFilter]));
          
          // Third subscription: catch ALL remote signing events for debugging
          // This is important because some implementations might not include tags we expect
          const debugSubId = Math.random().toString(36).substring(2, 15);
          const debugFilter = { 
            kinds: [NOSTR_KINDS.REMOTE_SIGNING],
            limit: 10
          };
          console.log('[WS-DEBUG] Setting up debug subscription for all remote signing events:', debugFilter);
          ws?.send(JSON.stringify(['REQ', debugSubId, debugFilter]));
        } else {
          console.warn('[WS-DEBUG] No NIP-46 session secret available for WebSocket subscription');
        }
      };
      
      ws.onmessage = async (event) => {
        try {
          console.log('[NIP46-DEBUG] WebSocket message received:', event.data);
          const data = JSON.parse(event.data);
          // Check for NIP-46 auth events
          if (Array.isArray(data) && data[0] === 'EVENT') {
            const nostrEvent = data[2];
            console.log('[NIP46-DEBUG] Received event:', data);
            
            if (nostrEvent) {
              // We're looking for NIP-46 auth events (kind 24133)
              if (nostrEvent.kind === NOSTR_KINDS.REMOTE_SIGNING) {
                console.log('[NIP46-DEBUG] Received NIP-46 auth event:', nostrEvent);
                console.log('[NIP46-DEBUG] Event tags:', nostrEvent.tags);
                console.log('[NIP46-DEBUG] Event content:', nostrEvent.content);
                
                // Store the pubkey for manual connection if needed
                if (nostrEvent.pubkey) {
                  localStorage.setItem('last_amber_pubkey', nostrEvent.pubkey);
                  console.log('[NIP46-DEBUG] Stored pubkey from event:', nostrEvent.pubkey);
                  
                  // Some Amber versions just send an event without tags, try to auto-connect
                  // if we get a remote signing event near the time of our login attempt
                  const now = Math.floor(Date.now() / 1000);
                  const eventTime = nostrEvent.created_at || 0;
                  const isRecent = Math.abs(now - eventTime) < 60; // Within the last minute
                  
                  if (isRecent) {
                    console.log('[NIP46-DEBUG] Recent event detected, attempting auto-connect');
                    try {
                      const result = await connectWithNIP46(nostrEvent.pubkey);
                      console.log('[NIP46-DEBUG] Auto-connect result:', result);
                      return; // Skip the rest of the checks if we've already connected
                    } catch (error) {
                      console.error('[NIP46-DEBUG] Auto-connect error:', error);
                    }
                  }
                }
                
                // Get the stored session secret and challenge
                const secret = localStorage.getItem('nostr_connect_session');
                const challenge = localStorage.getItem('nostr_connect_challenge');
                
                console.log('[NIP46-DEBUG] Stored secret:', secret ? secret.substring(0, 4) + '...' : 'null');
                console.log('[NIP46-DEBUG] Stored challenge:', challenge ? challenge.substring(0, 4) + '...' : 'null');
                
                if (!secret) {
                  console.warn('[NIP46-DEBUG] No session secret found for NIP-46 authentication');
                  return;
                }
                
                // Check if this event contains our secret in the tags
                const secretTag = nostrEvent.tags.find((tag: string[]) => 
                  tag[0] === 'secret' && tag[1] === secret
                );
                
                // Also check for challenge response if we sent a challenge
                const challengeTag = challenge ? nostrEvent.tags.find((tag: string[]) => 
                  tag[0] === 'challenge' && tag[1] === challenge
                ) : null;
                
                console.log('[NIP46-DEBUG] Found secret tag?', !!secretTag);
                console.log('[NIP46-DEBUG] Found challenge tag?', !!challengeTag);
                
                // Check for possible alternative authentication indicators:
                
                // 1. Check if any tag contains our secret (in case the tag format is different)
                const anySecretMatch = secret ? nostrEvent.tags.some((tag: string[]) => 
                  tag.length > 1 && tag[1] === secret
                ) : false;
                
                // 2. Check if this is a direct response to our subscription
                const responseToOurSub = nostrEvent.tags.some((tag: string[]) => 
                  tag[0] === 'method' && (tag[1] === 'connect' || tag[1] === 'auth')
                );
                
                // 3. Check if there's a 'p' tag that matches your expected target (could be the relay pubkey)
                const isTargetedToUs = nostrEvent.tags.some((tag: string[]) => 
                  tag[0] === 'p' && tag[1].length > 30
                );
                
                // Combine all possible auth signals
                const alternativeAuthValid = (anySecretMatch || responseToOurSub || isTargetedToUs) && nostrEvent.pubkey;
                
                console.log('[NIP46-DEBUG] Alternative auth indicators - Any secret match:', anySecretMatch, 
                           'Response to our sub:', responseToOurSub, 
                           'Targeted to us:', isTargetedToUs);
                
                // For newer NIP-46 implementations, they must respond with our challenge
                // For older implementations, just check the secret
                const strictAuthValid = secretTag && (!challenge || challengeTag);
                
                // Accept either strict or alternative auth methods
                const authValid = strictAuthValid || alternativeAuthValid;
                
                console.log('[NIP46-DEBUG] Auth valid?', authValid, '(Strict:', strictAuthValid, ', Alternative:', alternativeAuthValid, ')');
                
                if (authValid) {
                  // This is our connection response
                  const pubkey = nostrEvent.pubkey;
                  if (pubkey) {
                    // User has authenticated via Amber or other NIP-46 compatible app
                    console.log('[NIP46-DEBUG] Mobile login authenticated with pubkey:', pubkey);
                    
                    // Connect the user with this pubkey
                    try {
                      const result = await connectWithNIP46(pubkey);
                      console.log('[NIP46-DEBUG] NIP-46 connection result:', result);
                    } catch (error) {
                      console.error('[NIP46-DEBUG] Error in connectWithNIP46:', error);
                    }
                  } else {
                    console.error('[NIP46-DEBUG] Auth event has no pubkey');
                  }
                } else {
                  console.warn('[NIP46-DEBUG] NIP-46 auth event does not contain valid authentication data');
                }
              }
              
              // Also check for the older connect style (some implementations use method/connect tags)
              const methodTag = nostrEvent.tags.find((tag: string[]) => {
                console.log('[NIP46-DEBUG] Checking method tag:', tag);
                return (tag[0] === 'method' && (tag[1] === 'connect' || tag[1] === 'auth' || tag[1] === 'login'))
                  || (tag[0] === 'p' && tag[1].length > 30); // p tag with a pubkey is also common
              });
              
              if (methodTag && nostrEvent.pubkey) {
                console.log('[NIP46-DEBUG] Detected alternative auth method with pubkey:', nostrEvent.pubkey);
                console.log('[NIP46-DEBUG] Method tag:', methodTag);
                try {
                  const result = await connectWithNIP46(nostrEvent.pubkey);
                  console.log('[NIP46-DEBUG] Alternative auth connection result:', result);
                } catch (error) {
                  console.error('[NIP46-DEBUG] Error in alternative auth connection:', error);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[WS-DEBUG] WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('[WS-DEBUG] WebSocket closed, trying to reconnect in 5 seconds');
        // Try to reconnect in 5 seconds
        reconnectTimer = setTimeout(connectWebSocket, 5000);
      };
    };
    
    // Start the WebSocket connection
    connectWebSocket();
    
    return () => {
      // Clean up on unmount
      if (ws) {
        ws.close();
      }
      clearTimeout(reconnectTimer);
    };
  }, []);

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      setIsLoading(true);
      
      try {
        // Check if we have stored pubkey/user info
        const storedPubkey = localStorage.getItem('nostr_pubkey');
        const loginMethod = localStorage.getItem('nostr_login_method');
        
        // If we have a stored pubkey, try to get the user profile
        if (storedPubkey) {
          const profile = await getUserProfile(storedPubkey);
          
          if (profile) {
            const npub = hexToBech32(storedPubkey);
            
            setUser({
              pubkey: storedPubkey,
              npub: npub,
              profile,
              loginMethod: safeLoginMethod(loginMethod)
            });
            setIsConnected(true);
          }
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, []);

  // Connect using NIP-07 browser extension
  const connectWithNip07 = async (): Promise<boolean> => {
    if (!hasNostrExtension()) {
      console.error('NOSTR extension not found');
      return false;
    }

    try {
      setIsLoading(true);
      
      // Get the user's public key
      const pubkey = await getCurrentUserPubkey();
      if (!pubkey) {
        console.error('Failed to get public key');
        return false;
      }
      
      // Save pubkey to local storage
      localStorage.setItem('nostr_pubkey', pubkey);
      localStorage.setItem('nostr_login_method', 'nip07');
      
      // Get user profile
      const profile = await getUserProfile(pubkey);
      
      // Create user object
      const user: NostrUser = {
        pubkey,
        npub: hexToBech32(pubkey),
        profile: profile || {
          name: 'Anonymous',
          picture: DEFAULT_PROFILE_IMAGE
        },
        loginMethod: 'nip07'
      };
      
      setUser(user);
      setIsConnected(true);
      return true;
    } catch (error) {
      console.error('Error connecting to NOSTR:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Connect using NIP-46 (Amber) remote signing
  const connectWithNIP46 = async (pubkey: string): Promise<boolean> => {
    console.log('[CONNECT-DEBUG] Starting NIP-46 connection with pubkey:', pubkey);
    try {
      setIsLoading(true);
      
      if (!pubkey) {
        console.error('[CONNECT-DEBUG] No pubkey provided for NIP-46 connection');
        return false;
      }
      
      // Save pubkey to local storage
      localStorage.setItem('nostr_pubkey', pubkey);
      localStorage.setItem('nostr_login_method', 'nip46');
      console.log('[CONNECT-DEBUG] Saved pubkey and login method to localStorage');
      
      // Get user profile
      console.log('[CONNECT-DEBUG] Fetching user profile...');
      const profile = await getUserProfile(pubkey);
      console.log('[CONNECT-DEBUG] Profile fetch result:', profile ? 'Success' : 'Failed');
      
      // Create user object
      const user: NostrUser = {
        pubkey,
        npub: hexToBech32(pubkey),
        profile: profile || {
          name: 'Amber User',
          picture: DEFAULT_PROFILE_IMAGE
        },
        loginMethod: 'nip46'
      };
      
      console.log('[CONNECT-DEBUG] Setting user and connection state');
      setUser(user);
      setIsConnected(true);
      return true;
    } catch (error) {
      console.error('[CONNECT-DEBUG] Error connecting with NIP-46:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check for NIP-07 login from another tab
  const checkForNip07Login = useCallback(async (): Promise<boolean> => {
    // If already connected, no need to check
    if (isConnected) {
      console.log('[LOGIN-DEBUG] Already connected, skipping login check');
      return true;
    }
    
    console.log('[LOGIN-DEBUG] Checking for existing login...');
    
    try {
      // First check if we have a stored pubkey from NIP-46 (Amber)
      const storedPubkey = localStorage.getItem('nostr_pubkey');
      const loginMethod = localStorage.getItem('nostr_login_method');
      
      console.log('[LOGIN-DEBUG] Stored values - Pubkey exists:', !!storedPubkey, 'Login method:', loginMethod || 'none');
      
      // If we have a stored NIP-46 login, use it
      if (storedPubkey && loginMethod === 'nip46' && !isConnected) {
        console.log('[LOGIN-DEBUG] Found stored NIP-46 pubkey, attempting to reconnect');
        // Get user profile
        const profile = await getUserProfile(storedPubkey);
        
        if (profile) {
          console.log('[LOGIN-DEBUG] Successfully retrieved profile for stored pubkey');
          const npub = hexToBech32(storedPubkey);
          
          // Create user object
          const user: NostrUser = {
            pubkey: storedPubkey,
            npub,
            profile,
            loginMethod: 'nip46'
          };
          
          setUser(user);
          setIsConnected(true);
          console.log('[LOGIN-DEBUG] Successfully reconnected with stored NIP-46 pubkey');
          return true;
        } else {
          console.log('[LOGIN-DEBUG] Failed to get profile for stored pubkey');
        }
      }
      
      // Otherwise check if user has a browser extension and can get pubkey
      if (hasNostrExtension()) {
        console.log('[LOGIN-DEBUG] Detected NOSTR extension, checking pubkey');
        const pubkey = await getCurrentUserPubkey();
        
        if (pubkey) {
          console.log('[LOGIN-DEBUG] Retrieved pubkey from extension:', pubkey.substring(0, 8) + '...');
          // Get the stored pubkey
          const storedPubkey = localStorage.getItem('nostr_pubkey');
          
          // If the pubkeys don't match or we don't have a stored pubkey, update the user
          if (pubkey !== storedPubkey) {
            console.log('[LOGIN-DEBUG] Pubkey from extension different from stored, updating user');
            // Get user profile
            const profile = await getUserProfile(pubkey);
            
            // Create user object
            const user: NostrUser = {
              pubkey,
              npub: hexToBech32(pubkey),
              profile: profile || {
                name: 'Anonymous',
                picture: DEFAULT_PROFILE_IMAGE
              },
              loginMethod: 'nip07'
            };
            
            // Save pubkey to local storage
            localStorage.setItem('nostr_pubkey', pubkey);
            localStorage.setItem('nostr_login_method', 'nip07');
            
            setUser(user);
            setIsConnected(true);
            console.log('[LOGIN-DEBUG] Successfully connected with NIP-07 extension');
            return true;
          } else if (storedPubkey && !isConnected) {
            console.log('[LOGIN-DEBUG] Pubkey matches stored value, reconnecting user');
            const profile = await getUserProfile(pubkey);
            
            setUser({
              pubkey,
              npub: hexToBech32(pubkey),
              profile: profile || {
                name: 'Anonymous',
                picture: DEFAULT_PROFILE_IMAGE
              },
              loginMethod: 'nip07'
            });
            setIsConnected(true);
            return true;
          }
        }
      }
      
      console.log('[LOGIN-DEBUG] No valid login found during check');
      return false;
    } catch (error) {
      console.error('[LOGIN-DEBUG] Error checking for login:', error);
      return false;
    }
  }, [isConnected]);

  // Connect using any available method
  const connect = async (): Promise<boolean> => {
    // Try NIP-07 first if available
    if (hasNostrExtension()) {
      return connectWithNip07();
    }
    
    // TODO: Handle other connection methods
    // For now, just show an error
    console.error('No NOSTR connection method available');
    return false;
  };

  // Disconnect from NOSTR
  const disconnect = () => {
    localStorage.removeItem('nostr_pubkey');
    localStorage.removeItem('nostr_login_method');
    localStorage.removeItem('nostr_connect_session');
    setUser(null);
    setIsConnected(false);
  };

  return (
    <NostrContext.Provider value={{ 
      user, 
      isConnected, 
      isLoading, 
      connect, 
      connectWithNip07,
      connectWithNIP46,
      checkForNip07Login,
      disconnect 
    }}>
      {children}
    </NostrContext.Provider>
  );
};
