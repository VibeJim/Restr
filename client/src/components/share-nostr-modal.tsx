import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { NostrListing } from '@/types/nostr';
import { useNostr } from '@/context/nostr-provider';
import { createSignedEvent } from '@/lib/nostr';

interface ShareNostrModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: NostrListing | null;
}

export default function ShareNostrModal({ isOpen, onClose, listing }: ShareNostrModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();
  const { user, isConnected, connect } = useNostr();
  
  // Default note text with listing info
  const defaultNote = listing 
    ? `Check out this amazing listing on Restr: ${listing.content.title} ${
        listing.content.location ? `in ${listing.content.location}` : ''
      }\n\nhttps://nostr-stay.replit.app/listing/${listing.id}`
    : `Check out this amazing listing on Restr - the decentralized property rental platform!\n\nhttps://nostr-stay.replit.app`;
    
  const [noteText, setNoteText] = useState(defaultNote);

  const handleConnectNostr = async () => {
    try {
      const success = await connect();
      if (!success) {
        toast({
          title: "Connection failed",
          description: "Could not connect to Nostr. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error connecting to Nostr:', error);
      toast({
        title: "Connection Error",
        description: "There was an error connecting to Nostr. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    if (!isConnected || !user) {
      toast({
        title: "Not connected",
        description: "Please connect to Nostr first.",
        variant: "destructive"
      });
      return;
    }

    setIsSharing(true);
    
    try {
      // Create a signed kind 1 note event
      const event = await createSignedEvent({
        kind: 1,
        content: noteText,
        tags: [
          ["t", "restr"],
          ["t", "rental"],
          ...(listing ? [["e", listing.id, "", "mention"]] : []),
          ["r", "https://nostr-stay.replit.app"]
        ]
      });
      
      if (!event) {
        throw new Error("Failed to create event");
      }
      
      // This event will be published through the Nostr provider
      toast({
        title: "Success!",
        description: "Your listing has been shared on Nostr!",
        variant: "default"
      });
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error sharing to Nostr:', error);
      toast({
        title: "Sharing failed",
        description: "There was an error sharing your post to Nostr.",
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share on Nostr</DialogTitle>
          <DialogDescription>
            Share this listing with your followers on the Nostr network.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {!isConnected ? (
            <div className="flex flex-col items-center space-y-4">
              <p className="text-center text-sm">
                Connect to Nostr to share this listing with your followers.
              </p>
              <Button onClick={handleConnectNostr}>Connect to Nostr</Button>
            </div>
          ) : (
            <Textarea
              placeholder="Add a message..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={5}
              className="resize-none"
            />
          )}
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleShare} 
            disabled={isSharing || !isConnected || !noteText.trim()}
            className="ml-2"
          >
            {isSharing ? "Sharing..." : "Share on Nostr"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}