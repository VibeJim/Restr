import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from '@/hooks/use-toast';
import { useNostr } from '@/context/nostr-provider';
import { NostrReview, NostrListing } from '@/types/nostr';
import { getReviews, postReview, enrichReviewsWithProfiles } from '@/lib/nostr';
import { DEFAULT_PROFILE_IMAGE } from '@/lib/constants';
import { Rating } from '@/components/ui/rating';

interface ListingReviewsProps {
  listing: NostrListing;
  onReviewsLoaded?: (count: number) => void;
}

// Returns the best display name from a Nostr profile, falling back through fields.
const getDisplayName = (profile?: { name?: string; display_name?: string }): string => {
  if (!profile) return 'Anonymous';
  const name = profile.display_name?.trim() || profile.name?.trim();
  return name || 'Anonymous';
};

export default function ListingReviews({ listing, onReviewsLoaded }: ListingReviewsProps) {
  const { isConnected, user } = useNostr();
  const [reviews, setReviews] = useState<NostrReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);

  useEffect(() => {
    loadReviews();
  }, [listing.id]);

  // Fetches reviews from relays, then asynchronously enriches them with author profiles.
  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const fetchedReviews = await getReviews(listing.id);
      setReviews(fetchedReviews);
      
      if (onReviewsLoaded) {
        onReviewsLoaded(fetchedReviews.length);
      }

      // Fetch author profiles in the background so reviews render fast
      if (fetchedReviews.length > 0) {
        const withProfiles = await enrichReviewsWithProfiles(fetchedReviews);
        setReviews(withProfiles);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reviews. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!isConnected) {
      toast({
        title: 'Authentication Required',
        description: 'Please connect with NOSTR to leave a review.',
        variant: 'destructive',
      });
      return;
    }

    if (!reviewText.trim()) {
      toast({
        title: 'Review Required',
        description: 'Please enter a review before submitting.',
        variant: 'destructive',
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: 'Rating Required',
        description: 'Please select a rating before submitting.',
        variant: 'destructive',
      });
      return;
    }

    const trimmedReview = reviewText.trim();
    setIsSubmitting(true);
    
    try {
      const result = await postReview(listing.id, rating, trimmedReview);
      
      if (result.reviewId) {
        setReviewText('');
        setRating(0);
        
        // Optimistic review uses the connected user's profile for correct name display
        if (user) {
          const optimisticReview: NostrReview = {
            id: result.reviewId,
            pubkey: user.pubkey,
            created_at: Math.floor(Date.now() / 1000),
            content: {
              listingId: listing.id,
              rating,
              content: trimmedReview
            },
            tags: [
              ['t', 'restr-review'],
              ['e', listing.id, '', 'root'],
              ['rating', rating.toString()]
            ],
            sig: '',
            profile: user.profile
          };
          
          const updatedReviews = [optimisticReview, ...reviews];
          setReviews(updatedReviews);
          
          if (onReviewsLoaded) {
            onReviewsLoaded(updatedReviews.length);
          }
        }
        
        if (result.confirmedRelays > 0) {
          toast({
            title: 'Review Published',
            description: `Confirmed on ${result.confirmedRelays} of ${result.totalRelays} relays. Visible to all users.`,
            variant: 'default',
          });
        } else {
          toast({
            title: 'Review Saved Locally',
            description: 'Relays are temporarily unreachable. Your review is saved and will sync when they come back online.',
            variant: 'default',
          });
        }
        
        // Refresh reviews from the network after a delay to pick up the newly published one
        setTimeout(async () => {
          try {
            const fetchedReviews = await getReviews(listing.id);
            if (fetchedReviews.length > 0) {
              const withProfiles = await enrichReviewsWithProfiles(fetchedReviews);
              setReviews(withProfiles);
              if (onReviewsLoaded) {
                onReviewsLoaded(withProfiles.length);
              }
            }
          } catch (err) {
            console.log('Error refreshing reviews, keeping optimistic UI:', err);
          }
        }, 3000);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to sign the review. Make sure your NOSTR extension is connected.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error posting review:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while posting your review.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
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
      
      {/* Review Form */}
      <div className="mb-6">
        <div className="mb-4">
          <Rating
            value={rating}
            onChange={setRating}
            disabled={isSubmitting || !isConnected}
          />
        </div>
        <Textarea
          placeholder="Share your experience with this property..."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          className="w-full h-24 resize-none mb-3 bg-white"
          disabled={isSubmitting || !isConnected}
        />
        <div className="flex justify-between items-center">
          <p className="text-sm text-neutral-500">
            {isConnected ? 'Reviews are posted to the NOSTR network' : 'Connect with NOSTR to review'}
          </p>
          <Button 
            onClick={handleSubmitReview}
            disabled={isSubmitting || !isConnected || !reviewText.trim() || rating === 0}
            className="bg-primary hover:bg-primary-600 text-white"
          >
            {isSubmitting ? 'Posting...' : 'Post Review'}
          </Button>
        </div>
      </div>
      
      <Separator className="my-6" />
      
      {/* Reviews List */}
      <div className="space-y-6">
        {isLoading ? (
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
        ) : reviews.length === 0 ? (
          <div className="text-center py-6 text-neutral-500">
            <p>Be the first to leave a review!</p>
          </div>
        ) : (
          reviews.map((review) => {
            const displayName = getDisplayName(review.profile);
            return (
              <div key={review.id} className="bg-white p-4 rounded-lg border border-neutral-200">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={review.profile?.picture || DEFAULT_PROFILE_IMAGE} />
                    <AvatarFallback>
                      {displayName[0] || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {displayName}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {formatDate(review.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <Rating value={review.content.rating} readOnly />
                      </div>
                    </div>
                    <p className="mt-2 text-neutral-700 whitespace-pre-wrap">
                      {review.content.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
