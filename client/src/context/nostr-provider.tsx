import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  getCurrentUserPubkey, 
  getUserProfile, 
  hasNostrExtension, 
  hexToBech32, 
  bech32ToHex 
} from '@/lib/nostr';
import { NostrProfile, NostrUser } from '@/types/nostr';
import { DEFAULT_PROFILE_IMAGE, RELAYS } from '@/lib/constants';

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
      ws = new WebSocket('wss://relay.damus.io');
      
      ws.onopen = () => {
        console.log('WebSocket connected for NIP-46 remote signing');
        
        // Get the current session secret
        const secret = localStorage.getItem('nostr_connect_session');
        if (secret) {
          // Subscribe to NIP-46 auth events
          const subscriptionId = Math.random().toString(36).substring(2, 15);
          
          // Create a filter for NIP-46 authentication events
          const filter = {
            kinds: [24133], // NIP-46 remote signing kind
            // Look for relevant tags - both for secret and method=connect
            '#secret': [secret],
            // Also subscribe to any method=connect events for this relay
            // as a fallback for older implementations
          };
          
          console.log('Setting up NIP-46 subscription with filter:', filter);
          ws?.send(JSON.stringify(['REQ', subscriptionId, filter]));
          
          // Also subscribe to a broader filter for compatibility with different implementations
          const fallbackSubId = Math.random().toString(36).substring(2, 15);
          ws?.send(JSON.stringify(['REQ', fallbackSubId, { 
            kinds: [24133],
            // Some implementations use method=connect
            '#method': ['connect']
          }]));
        } else {
          console.warn('No NIP-46 session secret available for WebSocket subscription');
        }
      };
      
      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          // Check for NIP-46 auth events
          if (Array.isArray(data) && data[0] === 'EVENT') {
            const nostrEvent = data[2];
            
            if (nostrEvent) {
              // We're looking for NIP-46 auth events (kind 24133)
              if (nostrEvent.kind === 24133) {
                console.log('Received NIP-46 auth event:', nostrEvent);
                
                // Get the stored session secret
                const secret = localStorage.getItem('nostr_connect_session');
                if (!secret) {
                  console.warn('No session secret found for NIP-46 authentication');
                  return;
                }
                
                // Check if this event contains our secret in the tags
                const secretTag = nostrEvent.tags.find((tag: string[]) => 
                  tag[0] === 'secret' && tag[1] === secret
                );
                
                if (secretTag) {
                  // This is our connection response
                  const pubkey = nostrEvent.pubkey;
                  if (pubkey) {
                    // User has authenticated via Amber or other NIP-46 compatible app
                    console.log('Mobile login authenticated with pubkey:', pubkey);
                    
                    // Connect the user with this pubkey
                    await connectWithNIP46(pubkey);
                  }
                }
              }
              
              // Also check for the older connect style (some implementations use method/connect tags)
              const methodTag = nostrEvent.tags.find((tag: string[]) => 
                tag[0] === 'method' && tag[1] === 'connect'
              );
              
              if (methodTag && nostrEvent.pubkey) {
                console.log('Detected legacy connect method with pubkey:', nostrEvent.pubkey);
                await connectWithNIP46(nostrEvent.pubkey);
              }
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('WebSocket closed, trying to reconnect in 5 seconds');
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
    try {
      setIsLoading(true);
      
      if (!pubkey) {
        console.error('No pubkey provided for NIP-46 connection');
        return false;
      }
      
      // Save pubkey to local storage
      localStorage.setItem('nostr_pubkey', pubkey);
      localStorage.setItem('nostr_login_method', 'nip46');
      
      // Get user profile
      const profile = await getUserProfile(pubkey);
      
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
      
      setUser(user);
      setIsConnected(true);
      return true;
    } catch (error) {
      console.error('Error connecting with NIP-46:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check for NIP-07 login from another tab
  const checkForNip07Login = useCallback(async (): Promise<boolean> => {
    // If already connected, no need to check
    if (isConnected) return true;
    
    try {
      // Check if user has a browser extension and can get pubkey
      if (hasNostrExtension()) {
        const pubkey = await getCurrentUserPubkey();
        
        if (pubkey) {
          // Get the stored pubkey
          const storedPubkey = localStorage.getItem('nostr_pubkey');
          
          // If the pubkeys don't match, update the user
          if (pubkey !== storedPubkey) {
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
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for NIP-07 login:', error);
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
