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
    
    // Generate a NIP-46 connect URL for Amber
    const generateConnectUrl = () => {
      // Create a session ID for this connection request
      const sessionId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('nostr_connect_session', sessionId);
      
      // Base URL for connection
      const appName = encodeURIComponent('restr');
      const url = `nostr+walletconnect://${appName}?relay=${encodeURIComponent('wss://relay.damus.io')}&secret=${sessionId}`;
      
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
    if (isMobile) {
      // If on mobile, directly open the URL
      window.location.href = loginUrl;
    } else {
      toast({
        title: "Scan QR Code",
        description: "Use your Amber app or any NOSTR-compatible wallet to scan the QR code.",
        variant: "default"
      });
    }
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
              <TabsTrigger value="mobile">Mobile / Amber</TabsTrigger>
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
                {isMobile ? (
                  <>
                    <div className="text-center mb-4">
                      <h3 className="font-medium text-lg">Connect with Amber</h3>
                      <p className="text-sm text-neutral-500">
                        Click the button below to connect with the Amber app
                      </p>
                    </div>
                    <Button
                      onClick={handleMobileConnect}
                      className="w-full bg-primary hover:bg-primary-600 text-white"
                    >
                      Open Amber App
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <h3 className="font-medium text-lg">Scan with Mobile App</h3>
                      <p className="text-sm text-neutral-500">
                        Scan this QR code with Amber or any NIP-46 compatible NOSTR app
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg mb-4">
                      <QRCodeSVG value={qrValue} size={200} />
                    </div>
                    <div className="text-xs text-center text-neutral-500">
                      The QR code will remain active until you close this dialog
                    </div>
                  </>
                )}
              </div>
              
              <div className="text-sm bg-blue-50 text-blue-800 p-3 rounded-lg">
                <p className="font-medium">Don't have a NOSTR mobile app?</p>
                <p className="mt-1">
                  Download{' '}
                  <a 
                    href="https://amber.app" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline text-blue-900"
                  >
                    Amber
                  </a>{' '}
                  for iOS or Android to connect and sign your NOSTR events.
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
