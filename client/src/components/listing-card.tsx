import { useState } from 'react';
import { NostrListing } from '@/types/nostr';
import { Skeleton } from '@/components/ui/skeleton';

interface ListingCardProps {
  listing: NostrListing;
  onClick: (listing: NostrListing) => void;
}

export default function ListingCard({ listing, onClick }: ListingCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  // If we don't have a fully populated listing object yet
  if (!listing || !listing.content) {
    return <ListingCardSkeleton />;
  }

  const { title, location, price, currency, images } = listing.content;
  const imageUrl = Array.isArray(images) && images.length > 0 ? images[0] : '';
  const currencySymbol = currency === 'BTC' ? '₿' : 'ϟ';

  return (
    <div className="group cursor-pointer" onClick={() => onClick(listing)}>
      <div className="relative aspect-square rounded-xl overflow-hidden mb-2">
        {!isImageLoaded && (
          <Skeleton className="absolute inset-0 w-full h-full" />
        )}
        <img
          src={imageUrl}
          alt={title}
          className={`h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleImageLoad}
        />
        <button
          className="absolute top-3 right-3 text-neutral-50 hover:text-primary transition-colors"
          onClick={toggleFavorite}
        >
          <i className={`${isFavorite ? 'ri-heart-3-fill text-primary' : 'ri-heart-3-line'} text-2xl drop-shadow-md`}></i>
        </button>
      </div>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-neutral-800">{title}</h3>
          <p className="text-neutral-500 text-sm">{location}</p>
          <p className="text-neutral-500 text-sm">Available now</p>
          <p className="mt-1">
            <span className="font-medium">{currencySymbol}{price}</span> {currency === 'BTC' ? 'BTC' : 'sats'}/night
          </p>
        </div>
        <div className="flex items-center mt-1">
          <i className="ri-star-fill text-xs text-neutral-800"></i>
          <span className="text-sm ml-1">New</span>
        </div>
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
