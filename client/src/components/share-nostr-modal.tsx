import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { NostrListing } from '@/types/nostr';
import { useNostr } from '@/context/nostr-provider';
import { createSignedEvent, publishEvent } from '@/lib/nostr';
import { RELAYS } from '@/lib/constants';

interface ShareNostrModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: NostrListing | null;
}

export default function ShareNostrModal({ isOpen, onClose, listing }: ShareNostrModalProps) {
  const [isSharing, setIsSharing] = React.useState(false);
  const { toast } = useToast();
  const { user, isConnected, connect } = useNostr();
  
  // Format the message for the listing
  const getDefaultMessage = React.useCallback(() => {
    if (!listing) {
      return "Check out this amazing listing on Restr - the decentralized property rental platform!\n\nhttps://nostr-stay.replit.app";
    }
    
    return `Check out this amazing listing on Restr: ${listing.content.title} ${
      listing.content.location ? `in ${listing.content.location}` : ''
    }\n\nhttps://nostr-stay.replit.app/listing/${listing.id}`;
  }, [listing]);
  
  // Initialize note text
  const [noteText, setNoteText] = React.useState(() => getDefaultMessage());
  
  // Update note text when listing changes
  React.useEffect(() => {
    setNoteText(getDefaultMessage());
  }, [listing, getDefaultMessage]);

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
      // Prepare tags for the note
      const tags = [
        ["t", "restr"],
        ["t", "rental"],
        ["r", "https://nostr-stay.replit.app"]
      ];
      
      // Add the listing reference if available
      if (listing) {
        tags.push(["e", listing.id, "", "reply"]);
      }
      
      // Create a kind 1 text note
      const event = await createSignedEvent(1, noteText, tags);
      
      if (!event) {
        throw new Error("Failed to create event");
      }
      
      console.log("Created Nostr share event:", event);
      
      // Publish the event to relays
      const publishResult = await publishEvent(event, RELAYS);
      console.log("Publish result:", publishResult);
      
      toast({
        title: "Success!",
        description: "Your listing has been shared on Nostr!",
        variant: "default"
      });
      
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