import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from '@/hooks/use-toast';
import { useNostr } from '@/context/nostr-provider';
import { NostrReview, NostrListing } from '@/types/nostr';
import { getReviews, postReview } from '@/lib/nostr';
import { DEFAULT_PROFILE_IMAGE } from '@/lib/constants';
import { Rating } from '@/components/ui/rating';

interface ListingReviewsProps {
  listing: NostrListing;
  onReviewsLoaded?: (count: number) => void;
}

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

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const fetchedReviews = await getReviews(listing.id);
      setReviews(fetchedReviews);
      
      if (onReviewsLoaded) {
        onReviewsLoaded(fetchedReviews.length);
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
        // Store the review ID and content in localStorage for optimistic UI
        localStorage.setItem(`last_review_${listing.id}`, result.reviewId);
        localStorage.setItem(`last_review_content_${listing.id}`, trimmedReview);
        localStorage.setItem(`last_review_rating_${listing.id}`, rating.toString());
        
        // Clear the input fields
        setReviewText('');
        setRating(0);
        
        // Update the UI with an optimistic review
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
              ['e', listing.id, '', 'root'],
              ['k', '30002'],
              ['rating', rating.toString()]
            ],
            sig: '',
            profile: user.profile
          };
          
          // Add the optimistic review to the list
          const updatedReviews = [optimisticReview, ...reviews];
          setReviews(updatedReviews);
          
          // Update review count
          if (onReviewsLoaded) {
            onReviewsLoaded(updatedReviews.length);
          }
        }
        
        toast({
          title: 'Review Posted',
          description: 'Your review has been published to the NOSTR network.',
          variant: 'default',
        });
        
        // Try to reload reviews from the network
        try {
          const fetchedReviews = await getReviews(listing.id);
          if (fetchedReviews.length > 0) {
            setReviews(fetchedReviews);
            
            if (onReviewsLoaded) {
              onReviewsLoaded(fetchedReviews.length);
            }
          }
        } catch (err) {
          console.log('Error refreshing reviews, keeping optimistic UI:', err);
        }
      } else {
        toast({
          title: 'Warning',
          description: 'Your review was created but may not have reached all relays. It will appear locally.',
          variant: 'default',
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
        ) : reviews.length === 0 ? (
          <div className="text-center py-6 text-neutral-500">
            <p>Be the first to leave a review!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white p-4 rounded-lg border border-neutral-200">
              <div className="flex items-start space-x-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={review.profile?.picture || DEFAULT_PROFILE_IMAGE} />
                  <AvatarFallback>
                    {review.profile?.name?.[0] || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {review.profile?.name || 'Anonymous'}
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
          ))
        )}
      </div>
    </div>
  );
} 