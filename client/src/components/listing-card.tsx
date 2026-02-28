import { useState, useEffect } from 'react';
import { NostrListing } from '@/types/nostr';
import { Skeleton } from '@/components/ui/skeleton';
import { saveListing, unsaveListing, isListingSaved } from '@/lib/user-history';
import { RestrLogoIcon } from './restr-logo';

interface ListingCardProps {
  listing: NostrListing;
  onClick: (listing: NostrListing) => void;
}

export default function ListingCard({ listing, onClick }: ListingCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  // Check if this listing is already saved on mount
  useEffect(() => {
    if (listing && listing.id) {
      setIsFavorite(isListingSaved(listing.id));
    }
  }, [listing]);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
    setIsImageLoaded(true); // To hide skeleton
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isFavorite;
    setIsFavorite(newState);
    
    if (newState) {
      // Save to favorites
      saveListing(listing);
    } else {
      // Remove from favorites
      unsaveListing(listing.id);
    }
  };

  const navigateImage = (e: React.MouseEvent, direction: 'prev' | 'next') => {
    e.stopPropagation();
    const { images } = listing.content;
    if (!Array.isArray(images) || images.length <= 1) return;

    setCurrentImageIndex((prev) => {
      if (direction === 'next') {
        return (prev + 1) % images.length;
      } else {
        return (prev - 1 + images.length) % images.length;
      }
    });
  };

  // If we don't have a fully populated listing object yet
  if (!listing || !listing.content) {
    return <ListingCardSkeleton />;
  }

  const { title, location, price, currency, images } = listing.content;
  const imageUrl = Array.isArray(images) && images.length > 0 ? images[currentImageIndex] : '';
  const currencySymbol = currency === 'BTC' ? '₿' : 'ϟ';
  const hasMultipleImages = Array.isArray(images) && images.length > 1;

  // Format location display
  const formatLocation = (location: string) => {
    // Split location by comma
    const parts = location.split(',').map(part => part.trim());
    
    // If we have more than one part, assume the last part is the city
    if (parts.length > 1) {
      const city = parts.pop(); // Remove and get the last part (city)
      const suburb = parts.join(', '); // Join remaining parts as suburb
      return `${suburb}, ${city}`;
    }
    
    // If only one part, return as is
    return location;
  };

  // Check if listing is less than 14 days old
  const isNewListing = () => {
    const fourteenDaysInSeconds = 14 * 24 * 60 * 60;
    const now = Math.floor(Date.now() / 1000);
    return (now - listing.created_at) < fourteenDaysInSeconds;
  };

  return (
    <div className="group cursor-pointer w-full px-2 sm:px-0 sm:max-w-[280px]" onClick={() => onClick(listing)}>
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-1.5 flex sm:m-0 m-2 items-center justify-center bg-neutral-100">
        {!isImageLoaded && (
          <Skeleton className="absolute inset-0 w-full h-full" />
        )}
        {!imageError ? (
          <img
            src={imageUrl}
            alt={title}
            className={`h-full w-full object-cover group-hover:scale-105 transition-transform duration-300  ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <RestrLogoIcon size={48} className="mb-2" />
            <span className="text-xs text-neutral-500">Image Error</span>
          </div>
        )}
        {hasMultipleImages && !imageError && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5"
              onClick={(e) => navigateImage(e, 'prev')}
            >
              <i className="ri-arrow-left-s-line text-xl"></i>
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5"
              onClick={(e) => navigateImage(e, 'next')}
            >
              <i className="ri-arrow-right-s-line text-xl"></i>
            </button>
          </>
        )}
        <button
          className="absolute top-3 right-3 text-neutral-50 hover:text-primary transition-colors"
          onClick={toggleFavorite}
        >
          <i className={`${isFavorite ? 'ri-heart-3-fill text-red-500' : 'ri-heart-3-line text-red-500'} text-2xl drop-shadow-md`}></i>
        </button>
      </div>
      <h3 className="font-medium text-neutral-800 w-full px-0.5 sm:m-0 mx-2">{title}</h3>
      <div className="flex justify-between items-center px-0.5 mt-1 sm:m-0 mx-2">
        <div className="flex items-center space-x-2">
          <span className="font-medium">{currencySymbol}{price}</span>
          <span className="text-neutral-500 text-sm">{formatLocation(location)}</span>
        </div>
        {isNewListing() && (
          <div className="flex items-center ml-2">
            <i className="ri-star-fill text-xs text-[#f59e0b]"></i>
            <span className="text-sm ml-1">New</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="group">
      <div className="relative aspect-square rounded-xl overflow-hidden mb-2">
        <Skeleton className="absolute inset-0 w-full h-full" />
      </div>
      <div className="flex justify-between items-start">
        <div className="w-full">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-1" />
          <Skeleton className="h-4 w-1/3 mb-1" />
          <Skeleton className="h-5 w-1/4 mt-1" />
        </div>
      </div>
    </div>
  );
}
