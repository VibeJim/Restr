import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUserPubkey, getUserProfile, hasNostrExtension } from '@/lib/nostr';
import { NostrProfile, NostrUser } from '@/types/nostr';
import { DEFAULT_PROFILE_IMAGE } from '@/lib/constants';

interface NostrContextType {
  user: NostrUser | null;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
}

const NostrContext = createContext<NostrContextType>({
  user: null,
  isConnected: false,
  isLoading: true,
  connect: async () => false,
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

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      setIsLoading(true);
      
      // Check if the user has a NOSTR extension
      if (!hasNostrExtension()) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if we have stored pubkey/user info
        const storedPubkey = localStorage.getItem('nostr_pubkey');
        
        // If we have a stored pubkey, try to get the user profile
        if (storedPubkey) {
          const profile = await getUserProfile(storedPubkey);
          
          if (profile) {
            setUser({
              pubkey: storedPubkey,
              npub: `npub1${storedPubkey.substring(0, 6)}...${storedPubkey.substring(storedPubkey.length - 4)}`,
              profile,
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

  // Connect to NOSTR
  const connect = async (): Promise<boolean> => {
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
      
      // Get user profile
      const profile = await getUserProfile(pubkey);
      
      // Create user object
      const user: NostrUser = {
        pubkey,
        npub: `npub1${pubkey.substring(0, 6)}...${pubkey.substring(pubkey.length - 4)}`,
        profile: profile || {
          name: 'Anonymous',
          picture: DEFAULT_PROFILE_IMAGE
        },
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

  // Disconnect from NOSTR
  const disconnect = () => {
    localStorage.removeItem('nostr_pubkey');
    setUser(null);
    setIsConnected(false);
  };

  return (
    <NostrContext.Provider value={{ user, isConnected, isLoading, connect, disconnect }}>
      {children}
    </NostrContext.Provider>
  );
};
