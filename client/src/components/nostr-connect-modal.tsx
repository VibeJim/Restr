import { useNostr } from '@/context/nostr-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { hasNostrExtension } from '@/lib/nostr';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeSVG } from 'qrcode.react';
import { useIsMobile } from '@/hooks/use-mobile';

interface NostrConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NostrConnectModal({ isOpen, onClose }: NostrConnectModalProps) {
  const { connect, connectWithNip07, connectWithNIP46, checkForNip07Login } = useNostr();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [loginUrl, setLoginUrl] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [hasExtension, setHasExtension] = useState(false);
  const [activeTab, setActiveTab] = useState('extension');
  const isMobile = useIsMobile();
  
  useEffect(() => {
    // Check if the user has a NOSTR extension
    const extensionExists = hasNostrExtension();
    setHasExtension(extensionExists);
    
    // If on mobile, default to QR/Amber tab
    if (isMobile) {
      setActiveTab('mobile');
    }
    
    // Generate a NIP-46 connect URL for Amber following the official spec
    const generateConnectUrl = () => {
      // Create a random secret for this connection request (keep it shorter)
      const secret = Math.random().toString(36).substring(2, 10);
      localStorage.setItem('nostr_connect_session', secret);
      console.log('[QR-DEBUG] Generated session secret:', secret);
      
      // Define the relay used for NIP-46 communication
      const relay = 'wss://relay.damus.io';
      
      // Get the application and target URIs according to NIP-46
      const appName = 'restr';
      const appURL = window.location.origin;
      
      // Create a simpler metadata object
      const metadata = JSON.stringify({
        name: appName,
        url: appURL
      });
      
      // Encode everything properly
      const encodedRelay = encodeURIComponent(relay);
      const encodedMetadata = encodeURIComponent(metadata);
      
      // Create a simpler URL that's more compatible with Amber
      // nostrconnect://?relay=<relay_url>&metadata=<metadata_json>&secret=<secret>
      const url = `nostrconnect://?relay=${encodedRelay}&metadata=${encodedMetadata}&secret=${secret}`;
      
      // Log the URL for debugging
      console.log('[QR-DEBUG] Generated simplified NIP-46 connect URL:', url);
      
      setLoginUrl(url);
      setQrValue(url);
    };
    
    generateConnectUrl();
    
    // Setup a polling mechanism to check if the user has logged in (for QR code login)
    let pollInterval: NodeJS.Timeout;
    
    if (isOpen) {
      pollInterval = setInterval(async () => {
        // Check for both NIP-07 and NIP-46 login methods
        console.log('[QR-DEBUG] Polling for login...');
        const isLoggedIn = await checkForNip07Login();
        console.log('[QR-DEBUG] Login check result:', isLoggedIn);
        
        // If user is now connected, close the modal
        if (isLoggedIn) {
          console.log('[QR-DEBUG] User logged in, closing modal');
          onClose();
          clearInterval(pollInterval);
        }
      }, 2000); // Check every 2 seconds
    }
    
    // Cleanup the interval when the component unmounts or modal closes
    return () => {
      console.log('[QR-DEBUG] Cleanup: clearing poll interval');
      clearInterval(pollInterval);
    };
  }, [isOpen, isMobile, checkForNip07Login, onClose]);
  
  const handleExtensionConnect = async () => {
    if (!hasExtension) {
      toast({
        title: "NOSTR Extension Not Found",
        description: "Please install a NOSTR extension like nos2x, flamingo, or Alby to continue. (chrome, brave, edge, etc)",
        variant: "destructive"
      });
      return;
    }
    
    setIsConnecting(true);
    try {
      const success = await connectWithNip07();
      if (success) {
        toast({
          title: "Connected to NOSTR",
          description: "You're now connected with your NOSTR identity.",
          variant: "default"
        });
        onClose();
      } else {
        toast({
          title: "Connection Failed",
          description: "Could not connect to NOSTR. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to NOSTR.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleMobileConnect = () => {
    // Show QR code instructions for all users, even on mobile
    toast({
      title: "Scan or Copy Code",
      description: "Use your Amber app to scan this QR code or copy the connection code.",
      variant: "default",
      duration: 5000
    });
    
    // Try to actively connect with NIP-46
    // Using a timeout to allow time for the Amber app to respond
    setIsConnecting(true);
    
    // Set a timeout to check for connection after QR is scanned
    const checkConnectionTimer = setTimeout(async () => {
      // Get the stored session secret
      const secret = localStorage.getItem('nostr_connect_session');
      
      if (secret) {
        // The user might have already scanned the QR code
        // We'll display a checking toast to let them know we're looking for their connection
        toast({
          title: "Checking Connection",
          description: "Looking for your Amber connection...",
          variant: "default"
        });
      }
      
      setIsConnecting(false);
    }, 5000);
    
    // Clean up the timer 
    return () => clearTimeout(checkConnectionTimer);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Connect with NOSTR</DialogTitle>
          <DialogDescription>
            Choose how you want to connect using your NOSTR identity
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} mb-4`}>
              {!isMobile && <TabsTrigger value="extension">Browser Extension</TabsTrigger>}
              <TabsTrigger value="mobile">App Connect</TabsTrigger>
            </TabsList>
            
            <TabsContent value="extension" className="space-y-4">
              <div className="flex items-center p-3 border border-neutral-300 rounded-lg">
                <div className="mr-3 bg-[#FFF6E5] p-2 rounded-full">
                  <i className="ri-key-2-line text-[#FF8A00]"></i>
                </div>
                <div className="flex-1">
                  <div className="font-medium">Use NOSTR Extension</div>
                  <div className="text-sm text-neutral-500">Connect using your browser extension</div>
                </div>
                <Button
                  className="text-primary font-medium"
                  variant="ghost"
                  onClick={handleExtensionConnect}
                  disabled={isConnecting || !hasExtension}
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
              
              {!hasExtension && (
                <div className="text-sm bg-amber-50 text-amber-800 p-3 rounded-lg">
                  <p className="font-medium">No NOSTR Extension Detected</p>
                  <p className="mt-1">
                    Install a NOSTR extension like{' '}
                    <a 
                      href="https://www.getflamingo.org" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline text-amber-900"
                    >
                      flamingo
                    </a>{' '}
                    or{' '}
                    <a 
                      href="https://chromewebstore.google.com/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline text-amber-900"
                    >
                      nos2x
                    </a>{' '}
                    or{' '}
                    <a 
                      href="https://https://chromewebstore.google.com/detail/alby-bitcoin-wallet-for-l/iokeahhehimjnekafflcihljlcjccdbe" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline text-amber-900"
                    >
                      Alby (Advanced)
                    </a>{' '}
                    to continue.
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="mobile" className="space-y-4">
              <div className="flex flex-col items-center p-4 border border-neutral-300 rounded-lg">
                <div className="text-center mb-2">
                  <h3 className="font-medium text-lg">Connect with App</h3>
                  <p className="text-sm text-neutral-500 mb-2">
                    Scan this QR code with your NOSTR app
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded-lg mb-4 border-2 border-[#FF8900]">
                  <QRCodeSVG value={qrValue} size={isMobile ? 150 : 200} />
                </div>
                
                <div className="flex gap-2 w-full">
                  <Button
                    onClick={() => {
                      // Regenerate the QR code
                      console.log('[QR-DEBUG] Refreshing QR code...');
                      const secret = Math.random().toString(36).substring(2, 10);
                      localStorage.setItem('nostr_connect_session', secret);
                      
                      const relay = 'wss://relay.damus.io';
                      const appName = 'restr';
                      const appURL = window.location.origin;
                      
                      const metadata = JSON.stringify({
                        name: appName,
                        url: appURL
                      });
                      
                      const encodedRelay = encodeURIComponent(relay);
                      const encodedMetadata = encodeURIComponent(metadata);
                      
                      const url = `nostrconnect://?relay=${encodedRelay}&metadata=${encodedMetadata}&secret=${secret}`;
                      
                      console.log('[QR-DEBUG] Regenerated QR code URL:', url);
                      setLoginUrl(url);
                      setQrValue(url);
                      
                      toast({
                        title: "QR Code Refreshed",
                        description: "New connection code generated. Try scanning again.",
                        variant: "default"
                      });
                    }}
                    className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50"
                    variant="outline"
                  >
                    <i className="ri-refresh-line mr-1"></i> Refresh QR
                  </Button>
                </div>
                
                {isMobile && (
                  <div className="w-full mt-2">
                    <Button
                      onClick={() => {
                        // Copy the connection URL to clipboard
                        navigator.clipboard.writeText(loginUrl).then(() => {
                          toast({
                            title: "Connection URL Copied",
                            description: "Open your NOSTR app and paste this code to connect",
                            variant: "default",
                            duration: 3000
                          });
                        });
                      }}
                      className="w-full bg-[#FF8900] hover:bg-[#E67A00] text-white"
                    >
                      Copy Connection Code
                    </Button>
                  </div>
                )}
                
                {/* Manual Connect Option */}
                <div className="border-t border-gray-200 my-3 pt-3">
                  <p className="text-xs text-center mb-2 text-neutral-500 font-medium">
                    Connect Manually:
                  </p>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Enter your npub or hex pubkey" 
                      className="flex-1 text-xs py-1 px-2 border border-gray-300 rounded"
                      onChange={(e) => {
                        // Store the entered pubkey in a variable
                        localStorage.setItem('temp_amber_pubkey', e.target.value);
                      }} 
                    />
                    <Button
                      size="sm"
                      onClick={async () => {
                        setIsConnecting(true);
                        try {
                          // Get the entered pubkey
                          const tempPubkey = localStorage.getItem('temp_amber_pubkey');
                          if (!tempPubkey) {
                            toast({
                              title: "No Pubkey Entered",
                              description: "Please enter your public key first",
                              variant: "destructive"
                            });
                            setIsConnecting(false);
                            return;
                          }
                          
                          // Clean the pubkey - handle both npub and hex formats
                          let cleanPubkey = tempPubkey.trim();
                          
                          console.log('[QR-DEBUG] Attempting manual connection with pubkey:', cleanPubkey);
                          
                          // Attempt to connect with the pubkey
                          const success = await connectWithNIP46(cleanPubkey);
                          
                          if (success) {
                            toast({
                              title: "Connected to NOSTR",
                              description: "You're now connected with your NOSTR identity",
                              variant: "default"
                            });
                            localStorage.removeItem('temp_amber_pubkey');
                            onClose();
                          } else {
                            toast({
                              title: "Connection Failed",
                              description: "Could not connect with the provided key",
                              variant: "destructive"
                            });
                          }
                        } catch (error) {
                          console.error('[QR-DEBUG] Manual connection error:', error);
                          toast({
                            title: "Connection Error",
                            description: "An error occurred while connecting",
                            variant: "destructive"
                          });
                        } finally {
                          setIsConnecting(false);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isConnecting}
                    >
                      {isConnecting ? 'Connecting...' : 'Connect Manually'}
                    </Button>
                  </div>
                </div>
                
                <div className="text-xs text-center text-neutral-500">
                  This QR code uses the NIP-46 protocol for secure remote signing
                </div>
              </div>
              
              <div className="text-sm bg-amber-50 text-amber-800 p-3 rounded-lg">
                <p className="font-medium">How to Connect:</p>
                
                {isMobile ? (
                  <ol className="mt-2 ml-4 list-decimal text-xs space-y-1">
                    <li><strong>Open</strong> your NOSTR app</li>
                    <li><strong>Tap "Scan"</strong> in the app or use the copy feature above</li>
                    <li><strong>Authorize</strong> the connection when prompted</li>
                  </ol>
                ) : (
                  <ol className="mt-2 ml-4 list-decimal text-xs space-y-1">
                    <li><strong>Open</strong> your NOSTR app</li>
                    <li><strong>Tap "Scan"</strong> in the app</li>
                    <li><strong>Scan this QR code</strong> with your phone's camera</li>
                    <li><strong>Authorize</strong> the connection when prompted</li>
                  </ol>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          {/* <div className="text-xs text-neutral-500 text-center mt-6">
            By connecting, you agree to our <a href="#" className="text-primary">Terms of Service</a> and <a href="#" className="text-primary">Privacy Policy</a>
          </div> */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
