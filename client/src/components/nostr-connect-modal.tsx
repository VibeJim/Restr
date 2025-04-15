import { useNostr } from '@/context/nostr-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { hasNostrExtension } from '@/lib/nostr';
import { useToast } from '@/hooks/use-toast';

interface NostrConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NostrConnectModal({ isOpen, onClose }: NostrConnectModalProps) {
  const { connect } = useNostr();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  
  const handleConnect = async () => {
    if (!hasNostrExtension()) {
      toast({
        title: "NOSTR Extension Not Found",
        description: "Please install a NOSTR extension like nos2x or Alby to continue.",
        variant: "destructive"
      });
      return;
    }
    
    setIsConnecting(true);
    try {
      const success = await connect();
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Connect with NOSTR</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-neutral-600 mb-6">
            Connect your NOSTR identity to access all features of NostrBnB including personalized recommendations, bookings, and secure payments.
          </p>
          
          <div className="mb-6">
            <div className="flex items-center p-3 border border-neutral-300 rounded-lg mb-4">
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
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
            
            <div className="flex items-center p-3 border border-neutral-300 rounded-lg">
              <div className="mr-3 bg-[#E6FAF8] p-2 rounded-full">
                <i className="ri-scan-line text-[#00A699]"></i>
              </div>
              <div className="flex-1">
                <div className="font-medium">Scan QR Code</div>
                <div className="text-sm text-neutral-500">Use your NOSTR mobile wallet</div>
              </div>
              <Button className="text-primary font-medium" variant="ghost" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
          
          <div className="text-xs text-neutral-500 text-center">
            By connecting, you agree to our <a href="#" className="text-primary">Terms of Service</a> and <a href="#" className="text-primary">Privacy Policy</a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
