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
      // Create a random secret for this connection request
      const secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('nostr_connect_session', secret);
      
      // Define the relay used for NIP-46 communication
      const relay = 'wss://relay.damus.io';
      
      // Get the application and target URIs according to NIP-46
      const appName = 'restr';
      const appURL = window.location.origin;
      
      // Construct the URI according to the NIP-46 spec
      // nostrconnect://<pubkey>?relay=<relay>&metadata=<metadata>
      // Since we don't have a pubkey yet (the whole point is to get one), we use a placeholder
      // Amber doesn't require a specific pubkey parameter
      const metadata = JSON.stringify({
        name: appName,
        url: appURL,
        description: 'A NOSTR-based property rental platform',
        icons: [`${appURL}/favicon.ico`]
      });
      
      // Encode everything properly
      const encodedRelay = encodeURIComponent(relay);
      const encodedMetadata = encodeURIComponent(metadata);
      
      // Create the final URL according to NIP-46 spec and Amber's implementation
      // For maximum compatibility, we'll use the more widely supported format:
      // nostrconnect://?relay=<relay_url>&metadata=<metadata_json>&secret=<secret>
      // This works with Amber and other NIP-46 implementations
      const url = `nostrconnect://?relay=${encodedRelay}&metadata=${encodedMetadata}&secret=${secret}`;
      
      // Log the URL for debugging
      console.log('Generated NIP-46 connect URL:', url);
      
      setLoginUrl(url);
      setQrValue(url);
    };
    
    generateConnectUrl();
    
    // Setup a polling mechanism to check if the user has logged in (for QR code login)
    let pollInterval: NodeJS.Timeout;
    
    if (isOpen) {
      pollInterval = setInterval(() => {
        checkForNip07Login();
      }, 2000); // Check every 2 seconds
    }
    
    // Cleanup the interval when the component unmounts or modal closes
    return () => {
      clearInterval(pollInterval);
    };
  }, [isOpen, isMobile, checkForNip07Login]);
  
  const handleExtensionConnect = async () => {
    if (!hasExtension) {
      toast({
        title: "NOSTR Extension Not Found",
        description: "Please install a NOSTR extension like nos2x or Alby to continue.",
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
    
    // We'll rely on the QR code display for all users
    // This allows the web app to stay in the browser
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
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="extension">Browser Extension</TabsTrigger>
              <TabsTrigger value="mobile">Amber App</TabsTrigger>
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
                      href="https://getalby.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline text-amber-900"
                    >
                      Alby
                    </a>{' '}
                    or{' '}
                    <a 
                      href="https://github.com/fiatjaf/nos2x" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline text-amber-900"
                    >
                      nos2x
                    </a>{' '}
                    to continue.
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="mobile" className="space-y-4">
              <div className="flex flex-col items-center p-4 border border-neutral-300 rounded-lg">
                <div className="text-center mb-2">
                  <h3 className="font-medium text-lg">Connect with Amber</h3>
                  <p className="text-sm text-neutral-500 mb-2">
                    Scan this QR code with your Amber app
                  </p>
                  <img 
                    src="https://amber.app/wp-content/uploads/2023/03/amber-horizontal.svg" 
                    alt="Amber App Logo" 
                    className="h-6 mx-auto mb-2"
                  />
                </div>
                
                <div className="bg-white p-3 rounded-lg mb-4 border-2 border-[#FF8900]">
                  <QRCodeSVG value={qrValue} size={isMobile ? 150 : 200} />
                </div>
                
                {isMobile && (
                  <div className="w-full mb-3">
                    <Button
                      onClick={() => {
                        // Copy the connection URL to clipboard
                        navigator.clipboard.writeText(loginUrl).then(() => {
                          toast({
                            title: "Connection URL Copied",
                            description: "Open Amber app and paste this code to connect",
                            variant: "default",
                            duration: 3000
                          });
                        });
                      }}
                      className="w-full bg-[#FF8900] hover:bg-[#E67A00] text-white"
                    >
                      Copy Connection Code
                    </Button>
                    <p className="text-xs text-center mt-2 text-neutral-500">
                      You can copy the code and manually paste it in the Amber app
                    </p>
                  </div>
                )}
                
                <div className="text-xs text-center text-neutral-500">
                  This QR code uses the NIP-46 protocol for secure remote signing
                </div>
              </div>
              
              <div className="text-sm bg-amber-50 text-amber-800 p-3 rounded-lg">
                <p className="font-medium">How to Connect with Amber:</p>
                
                {isMobile ? (
                  <ol className="mt-2 ml-4 list-decimal text-xs space-y-1">
                    <li><strong>Install Amber</strong> from the App Store or Google Play if you don't have it</li>
                    <li><strong>Open Amber</strong> on your device</li>
                    <li><strong>Tap "Scan"</strong> in the Amber app or use the copy feature above</li>
                    <li><strong>Authorize</strong> the connection when prompted</li>
                  </ol>
                ) : (
                  <ol className="mt-2 ml-4 list-decimal text-xs space-y-1">
                    <li><strong>Install Amber</strong> on your mobile device</li>
                    <li><strong>Open Amber</strong> and tap "Scan" in the app</li>
                    <li><strong>Scan this QR code</strong> with your phone's camera</li>
                    <li><strong>Authorize</strong> the connection when prompted</li>
                  </ol>
                )}
                
                <p className="mt-3">
                  <a 
                    href="https://amber.app" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline text-amber-900 font-medium"
                  >
                    Amber
                  </a>{' '}
                  is the recommended wallet for NOSTR. It enables secure sign-in without sharing your private keys.
                </p>
                <p className="mt-2">
                  <a 
                    href="https://apps.apple.com/us/app/amber-bitcoin-lightning-nostr/id1641569086" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block mr-3"
                  >
                    <img src="https://amber.app/wp-content/uploads/2023/03/download-from-app-store.svg" alt="Download from App Store" className="h-8" />
                  </a>
                  <a 
                    href="https://play.google.com/store/apps/details?id=com.amberapp.amber" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <img src="https://amber.app/wp-content/uploads/2023/03/get-it-on-google-play.svg" alt="Get it on Google Play" className="h-8" />
                  </a>
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="text-xs text-neutral-500 text-center mt-6">
            By connecting, you agree to our <a href="#" className="text-primary">Terms of Service</a> and <a href="#" className="text-primary">Privacy Policy</a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
