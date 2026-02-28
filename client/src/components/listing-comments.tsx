import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from '@/hooks/use-toast';
import { useNostr } from '@/context/nostr-provider';
import { NostrComment, NostrListing } from '@/types/nostr';
import { getComments, postComment, zapComment } from '@/lib/nostr';
import { DEFAULT_PROFILE_IMAGE } from '@/lib/constants';

interface ListingCommentsProps {
  listing: NostrListing;
  onCommentsLoaded?: (count: number) => void;
}

export default function ListingComments({ listing, onCommentsLoaded }: ListingCommentsProps) {
  const { isConnected, user } = useNostr();
  const [comments, setComments] = useState<NostrComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zapAmount, setZapAmount] = useState(1000); // Default amount in sats
  const [commentToZap, setCommentToZap] = useState<NostrComment | null>(null);

  // Load comments when the component mounts
  useEffect(() => {
    if (listing) {
      loadComments();
    }
  }, [listing]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      console.log(`Loading comments for listing ${listing.id}`);
      const fetchedComments = await getComments(listing.id);
      console.log(`Received ${fetchedComments.length} comments`);
      setComments(fetchedComments);
      
      // Call the onCommentsLoaded callback if provided
      if (onCommentsLoaded) {
        onCommentsLoaded(fetchedComments.length);
      }
      
      // If we posted a comment but it wasn't found in the fetch,
      // try to add it optimistically from local storage
      if (fetchedComments.length === 0) {
        const lastPostedCommentId = localStorage.getItem(`last_comment_${listing.id}`);
        const lastPostedCommentContent = localStorage.getItem(`last_comment_content_${listing.id}`);
        
        if (lastPostedCommentId && lastPostedCommentContent && user) {
          console.log(`Adding optimistic comment from local storage: ${lastPostedCommentId}`);
          const optimisticComment: NostrComment = {
            id: lastPostedCommentId,
            pubkey: user.pubkey,
            created_at: Math.floor(Date.now() / 1000),
            content: lastPostedCommentContent,
            tags: [['e', listing.id, '', 'root']],
            sig: '',
            profile: user.profile,
            zapCount: 0,
            zapAmount: 0
          };
          
          setComments([optimisticComment]);
          
          // Update comment count with the optimistic comment
          if (onCommentsLoaded) {
            onCommentsLoaded(1);
          }
        }
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!isConnected) {
      toast({
        title: 'Authentication Required',
        description: 'Please connect with NOSTR to leave a comment.',
        variant: 'destructive',
      });
      return;
    }

    if (!commentText.trim()) {
      toast({
        title: 'Comment Required',
        description: 'Please enter a comment before submitting.',
        variant: 'destructive',
      });
      return;
    }

    const trimmedComment = commentText.trim();
    setIsSubmitting(true);
    
    try {
      const result = await postComment(listing.id, trimmedComment);
      
      if (result.commentId) {
        // Store the comment ID and content in localStorage for optimistic UI
        localStorage.setItem(`last_comment_${listing.id}`, result.commentId);
        localStorage.setItem(`last_comment_content_${listing.id}`, trimmedComment);
        
        // Clear the input field
        setCommentText('');
        
        // Update the UI with an optimistic comment
        if (user) {
          const optimisticComment: NostrComment = {
            id: result.commentId,
            pubkey: user.pubkey,
            created_at: Math.floor(Date.now() / 1000),
            content: trimmedComment,
            tags: [['e', listing.id, '', 'root']],
            sig: '',
            profile: user.profile,
            zapCount: 0,
            zapAmount: 0
          };
          
          // Add the optimistic comment to the list
          const updatedComments = [optimisticComment, ...comments];
          setComments(updatedComments);
          
          // Update comment count
          if (onCommentsLoaded) {
            onCommentsLoaded(updatedComments.length);
          }
        }
        
        toast({
          title: 'Comment Posted',
          description: 'Your comment has been published to the NOSTR network.',
          variant: 'default',
        });
        
        // Try to reload comments from the network, but don't replace our optimistic UI
        // if the network fetch fails
        try {
          const fetchedComments = await getComments(listing.id);
          if (fetchedComments.length > 0) {
            setComments(fetchedComments);
            
            // Update comment count
            if (onCommentsLoaded) {
              onCommentsLoaded(fetchedComments.length);
            }
          }
        } catch (err) {
          console.log('Error refreshing comments, keeping optimistic UI:', err);
        }
      } else {
        toast({
          title: 'Warning',
          description: 'Your comment was created but may not have reached all relays. It will appear locally.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while posting your comment.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleZapComment = async () => {
    if (!commentToZap) return;
    
    if (!isConnected) {
      toast({
        title: 'Authentication Required',
        description: 'Please connect with NOSTR to send zaps.',
        variant: 'destructive',
      });
      setCommentToZap(null);
      return;
    }

    try {
      toast({
        title: 'Creating Zap Request',
        description: 'Preparing to zap the comment...',
      });
      
      const result = await zapComment(commentToZap.id, zapAmount);
      
      if (result.zapRequestEvent) {
        // If we have a browser extension that can handle zaps, use it
        if (window.nostr && typeof window.nostr.signEvent === 'function') {
          const ev = result.zapRequestEvent;
          
          // NIP-57: Open a lightning wallet to complete the zap
          // We're using the event.id as a unique identifier for this zap
          // This assumes there's a web-based lightning wallet that can handle
          // the zap flow. In a real app, you might add more logic here to
          // handle different wallet types.
          window.open(`lightning:${ev.id}?amount=${zapAmount}000`, '_blank');
          
          toast({
            title: 'Zap Initiated',
            description: 'Please complete the payment in your lightning wallet.',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Zap Created',
            description: 'Your zap request was created, but no compatible lightning wallet was found to process it.',
            variant: 'default',
          });
        }
      } else {
        toast({
          title: 'Zap Failed',
          description: 'Unable to create zap request. The author might not have a lightning address set up.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error zapping comment:', error);
      toast({
        title: 'Zap Error',
        description: 'An error occurred while trying to zap the comment.',
        variant: 'destructive',
      });
    } finally {
      setCommentToZap(null);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="my-8">
      <h3 className="text-xl font-bold mb-6">Reviews</h3>
      
      {/* Comment Form */}
      <div className="mb-6">
        <Textarea
          placeholder="Share your thoughts or questions about this property..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="w-full h-24 resize-none mb-3"
          disabled={isSubmitting || !isConnected}
        />
        <div className="flex justify-between items-center">
          <p className="text-sm text-neutral-500">
            {isConnected ? 'Reviews are posted to the NOSTR network' : 'Connect with NOSTR to review'}
          </p>
          <Button 
            onClick={handleSubmitComment}
            disabled={isSubmitting || !isConnected || !commentText.trim()}
            className="bg-primary hover:bg-primary-600 text-white"
          >
            {isSubmitting ? 'Posting...' : 'Post Review'}
          </Button>
        </div>
      </div>
      
      <Separator className="my-6" />
      
      {/* Comments List */}
      <div className="space-y-6">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex space-x-4 animate-pulse">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))
        ) : comments.length === 0 ? (
          <div className="text-center py-6 text-neutral-500">
            <p>Be the first to leave a review!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-white p-4 rounded-lg border border-neutral-200">
              <div className="flex items-start">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={comment.profile?.picture || DEFAULT_PROFILE_IMAGE} alt="User" />
                  <AvatarFallback>
                    {(comment.profile?.display_name || 'User').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">
                        {comment.profile?.display_name || 'Anonymous User'}
                      </h4>
                      <p className="text-sm text-neutral-500">{formatDate(comment.created_at)}</p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                            onClick={() => setCommentToZap(comment)}
                            disabled={!isConnected}
                          >
                            <i className="ri-flashlight-line mr-1"></i>
                            <span>{comment.zapCount || 0}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Send a zap to reward this comment!</p>
                          {comment.zapAmount ? (
                            <p className="text-xs">Total: {comment.zapAmount} sats</p>
                          ) : null}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="mt-2 text-neutral-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Zap Dialog */}
      <AlertDialog open={!!commentToZap} onOpenChange={(open) => !open && setCommentToZap(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zap this comment</AlertDialogTitle>
            <AlertDialogDescription>
              Zap with bitcoin lightning to reward {commentToZap?.profile?.name || 'this user'} for their comment.
              <div className="mt-4">
                <label className="block mb-2 text-sm font-medium">
                  Zap amount (in sats)
                </label>
                <div className="flex space-x-2">
                  {[100, 1000, 5000, 10000].map(amount => (
                    <Button
                      key={amount}
                      variant={zapAmount === amount ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setZapAmount(amount)}
                    >
                      {amount}
                    </Button>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleZapComment}>
              <i className="ri-flashlight-line mr-1"></i>
              Zap {zapAmount} sats
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}