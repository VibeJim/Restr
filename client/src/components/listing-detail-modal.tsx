import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NostrListing, NostrUser } from '@/types/nostr';
import { useState, useEffect, useRef } from 'react';
import { getUser, sendEncryptedDirectMessage, getReviews } from '@/lib/nostr';
import { useNostr } from '@/context/nostr-provider';
import { DEFAULT_PROFILE_IMAGE, AMENITIES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import CalendarAvailability from './calendar-availability';
import ListingReviews from './listing-reviews';
import ShareNostrModal from './share-nostr-modal';
import { saveViewedListing, toggleSavedListing, isListingSaved } from '@/lib/user-history';
import { RestrLogoIcon } from './restr-logo';
import ImageViewer from './image-viewer';

interface ListingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: NostrListing | null;
}

export default function ListingDetailModal({ isOpen, onClose, listing }: ListingDetailModalProps) {
  const { isConnected } = useNostr();
  const { toast } = useToast();
  const [host, setHost] = useState<NostrUser | null>(null);
  const [isLoadingHost, setIsLoadingHost] = useState(false);
  const [showAllDescription, setShowAllDescription] = useState(false);
  const [checkIn, setCheckIn] = useState<string>('');
  const [checkOut, setCheckOut] = useState<string>('');
  const [guests, setGuests] = useState(2);
  const [isSaved, setIsSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const commentsRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  useEffect(() => {
    const loadHostData = async () => {
      if (listing && isOpen) {
        // Save this listing to viewed history
        saveViewedListing(listing);
        
        // Check if listing is saved
        setIsSaved(isListingSaved(listing.id));
        
        setIsLoadingHost(true);
        try {
          const hostData = await getUser(listing.pubkey);
          console.log('hostData', hostData);
          setHost(hostData);
        } catch (error) {
          console.error('Error loading host data', error);
        } finally {
          setIsLoadingHost(false);
        }

        // Load review count from the same source as the reviews component
        try {
          const reviews = await getReviews(listing.id);
          setReviewCount(reviews.length);
        } catch (error) {
          console.error('Error loading review count', error);
        }
      }
    };

    loadHostData();
  }, [listing, isOpen]);

  // Function to scroll to comments section
  const scrollToComments = () => {
    if (commentsRef.current) {
      commentsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Set default check-in date (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setCheckIn(tomorrow.toISOString().split('T')[0]);
      
      // Set default check-out date (5 days after check-in)
      const checkoutDate = new Date(tomorrow);
      checkoutDate.setDate(checkoutDate.getDate() + 5);
      setCheckOut(checkoutDate.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!listing) return null;

  const handleMessageHost = async () => {
    if (!isConnected) {
      toast({
        title: "Authentication Required",
        description: "Please connect with NOSTR to message the host.",
        variant: "destructive"
      });
      return;
    }

    if (!host || !listing) {
      toast({
        title: "Error",
        description: "Unable to find host information. Please try again later.",
        variant: "destructive"
      });
      return;
    }

    // Show toast immediately to indicate processing
    toast({
      title: "Preparing Message...",
      description: "Initializing secure NOSTR connection",
    });

    // Validate dates
    if (!checkIn || !checkOut) {
      toast({
        title: "Dates Required",
        description: "Please select check-in and check-out dates to include in your message.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create the message content with booking details
      const messageContent = `
Hello! I'm interested in your listing "${listing.content.title}".

Booking details:
- Check-in: ${formatDate(checkIn)}
- Check-out: ${formatDate(checkOut)}
- Guests: ${guests}
- Total nights: ${totalNights}
- Approx total: ${listing.content.currency === 'USD' ? '$' : '₿'}${total} ${listing.content.currency === 'USD' ? 'USD' : 'BTC'}

Please let me know if this property is available during these dates.
`.trim();
      
      toast({
        title: "Encrypting Message...",
        description: "Using NOSTR NIP-04 encryption standard",
      });
      
      // Send the encrypted message
      const result = await sendEncryptedDirectMessage(listing.pubkey, messageContent);
      
      if (result) {
        // Close the modal
        onClose();
        
        // Show success toast
        toast({
          title: "Message Sent!",
          description: "Your message has been encrypted and sent to the host. To view responses, download oxchat and use your NOSTR private key (nsec).",
          variant: "default"
        });
      } else {
        toast({
          title: "Message Failed",
          description: "Unable to send encrypted message. This might be due to NOSTR relay connectivity issues or missing NIP-04 support in your extension.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error sending encrypted message:", error);
      toast({
        title: "Message Error",
        description: "Failed to send encrypted message. Make sure your NOSTR extension supports NIP-04 encryption. Error: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive"
      });
    }
  };

  const totalNights = checkIn && checkOut 
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;

  const subTotal = listing.content.price * totalNights;
  // Removed cleaning fee and service fee as requested
  const total = subTotal; // Total is now just the subtotal

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format location display (same as card)
  const formatLocation = (location: string) => {
    const parts = location.split(',').map(part => part.trim());
    if (parts.length > 1) {
      const city = parts.pop();
      const suburb = parts.join(', ');
      return `${suburb}, ${city}`;
    }
    return location;
  };

  const allAmenities = listing.content.amenities || [];
  const displayedAmenities = showAllAmenities ? allAmenities : allAmenities.slice(0, 6);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 flex flex-col">
        <DialogTitle className="sr-only">{listing.content.title}</DialogTitle>
        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">

          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              className="flex items-center text-sm font-medium hover:underline"
              onClick={() => setShowShareModal(true)}
            >
              <i className="ri-share-line mr-1"></i>
              Share
            </Button>
            <Button 
              variant="ghost" 
              className="flex items-center text-sm font-medium hover:underline"
              onClick={() => {
                if (listing) {
                  const newSavedState = toggleSavedListing(listing);
                  setIsSaved(newSavedState);
                  
                  toast({
                    title: newSavedState ? "Saved to favorites" : "Removed from favorites",
                    variant: "default"
                  });
                }
              }}
            >
              <i className={`${isSaved ? 'ri-heart-3-fill text-red-500' : 'ri-heart-3-line'} mr-1`}></i>
              {isSaved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
        
        {/* Share Modal */}
        <ShareNostrModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          listing={listing}
        />

        {/* Modal Body */}
        <div className="flex-grow overflow-y-auto p-6">
          {/* Listing Title - Fixed spacing and alignment */}
          <div className="mb-5">
            <h2 className="text-2xl font-bold mb-2">{listing.content.title}</h2>
            <div className="flex flex-wrap items-center">
              <span className="flex items-center mr-3">
                <i className="ri-star-fill text-xs mr-1"></i>
                <span className="text-sm font-medium">New</span>
              </span>
              <span 
                className="text-sm text-neutral-500 underline mr-3 cursor-pointer" 
                onClick={scrollToComments}
              >
                {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
              </span>
              <span className="text-sm text-neutral-500">{formatLocation(listing.content.location)}</span>
            </div>
          </div>

          {/* Photos Grid - Updated Layout */}
          <div className="mb-6">
            {/* Main Image */}
            <div
              className="w-full h-[350px] mb-2 rounded-xl overflow-hidden flex items-center justify-center bg-neutral-100 cursor-pointer"
              onClick={() => {
                setShowImageViewer(true);
              }}
            >
              {!imageError ? (
                <img
                  src={listing.content.images[selectedImageIndex] || ''}
                  alt={listing.content.title}
                  className="h-full w-full object-cover"
                  onError={() => setImageError(true)} // You might want to handle image error for selectedImageIndex
                />
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full">
                  <RestrLogoIcon size={64} className="mb-2" />
                  <span className="text-xs text-neutral-500">Image Error</span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {listing.content.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {listing.content.images.map((image, index) => (
                  <div
                    key={index}
                    className={`w-20 h-20 rounded-md overflow-hidden cursor-pointer border-2 ${selectedImageIndex === index ? 'border-primary' : 'border-transparent'}`}
                    onClick={() => {
                      setSelectedImageIndex(index);
                      setShowImageViewer(true);
                    }}
                  >
                    <img
                      src={image}
                      alt={`${listing.content.title} thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Image Viewer */}
          <ImageViewer
            isOpen={showImageViewer}
            onClose={() => setShowImageViewer(false)}
            images={listing.content.images}
            initialIndex={selectedImageIndex}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Left Column - Description */}
            <div className="md:col-span-2">
              {/* Host Info */}
              <div className="flex items-start justify-between pb-6 border-b border-neutral-200">
                <div>
                  <h3 className="text-xl font-bold">
                    {listing.content.type?.join(', ')} by {host?.profile?.display_name || 'Host'}
                  </h3>
                  <p className="text-neutral-500">
                    {listing.content.maxGuests} guests · {listing.content.bedrooms} bedroom
                    {listing.content.bedrooms !== 1 ? 's' : ''} · {listing.content.beds} bed
                    {listing.content.beds !== 1 ? 's' : ''} · {listing.content.bathrooms} bath
                    {listing.content.bathrooms !== 1 ? 's' : ''}
                  </p>
                </div>
                {isLoadingHost ? (
                  <Skeleton className="h-14 w-14 rounded-full" />
                ) : (
                  <div className="h-14 w-14 rounded-full overflow-hidden">
                    <img 
                      src={host?.profile?.picture || DEFAULT_PROFILE_IMAGE} 
                      alt="Host" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="py-6 border-b border-neutral-200">
                <div className="flex items-start mb-4">
                  <i className="ri-home-4-line text-2xl text-neutral-700 mt-1 mr-4"></i>
                  <div>
                    <h4 className="font-bold">Entire home</h4>
                    <p className="text-neutral-500">You'll have the apartment to yourself.</p>
                  </div>
                </div>
                {/* <div className="flex items-start mb-4">
                  <i className="ri-medal-line text-2xl text-neutral-700 mt-1 mr-4"></i>
                  <div>
                    <h4 className="font-bold">Connect host</h4>
                    <p className="text-neutral-500">MListings on the NOSTR network.</p>
                  </div>
                </div> */}
                <div className="flex items-start">
                  <i className="ri-calendar-check-line text-2xl text-neutral-700 mt-1 mr-4"></i>
                  <div>
                    <h4 className="font-bold">Free cancellation before check-in</h4>
                    <p className="text-neutral-500">Full refund before your stay begins.</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="py-6 border-b border-neutral-200">
                <p className={`${!showAllDescription && 'line-clamp-3'} mb-4`}>
                  {listing.content.description}
                </p>
                {listing.content.description.length > 200 && (
                  <Button 
                    variant="ghost" 
                    className="font-semibold hover:underline p-0"
                    onClick={() => setShowAllDescription(!showAllDescription)}
                  >
                    {showAllDescription ? 'Show less' : 'Show more'}
                  </Button>
                )}
              </div>

              {/* Amenities */}
              <div className="py-6 border-b border-neutral-200">
                <h3 className="text-xl font-bold mb-4">What this place offers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedAmenities.map((amenity, index) => {
                    const amenityObj = AMENITIES.find(a => a.name.toLowerCase() === amenity.toLowerCase());
                    return (
                      <div key={index} className="flex items-center">
                        <i className={`${amenityObj?.icon || 'ri-checkbox-circle-line'} text-xl mr-3`}></i>
                        <span>{amenity}</span>
                      </div>
                    );
                  })}
                </div>
                {allAmenities.length > 6 && (
                  <Button 
                    variant="outline"
                    className="mt-4 px-5 py-2 border border-neutral-800 rounded-lg font-semibold hover:bg-neutral-100 transition"
                    onClick={() => setShowAllAmenities(!showAllAmenities)}
                  >
                    {showAllAmenities 
                      ? 'Show less' 
                      : `Show all ${allAmenities.length} amenities`}
                  </Button>
                )}
              </div>

              {/* Calendar Availability */}
              <div className="py-6 border-b border-neutral-200">
                <CalendarAvailability 
                  listing={listing}
                  isHost={host?.pubkey === listing.pubkey}
                  onAvailabilityChange={(availableDates) => {
                    // If needed, we can update the booking form based on available dates
                    console.log('Available dates:', availableDates);
                  }}
                />
              </div>
              
              {/* Listing Reviews */}
              <div ref={commentsRef} className="py-6 border-b border-neutral-200">
                <ListingReviews
                  listing={listing}
                  onReviewsLoaded={setReviewCount}
                />
              </div>

              {/* NOSTR Host Info */}
              <div className="py-6 border-b border-neutral-200">
                <h3 className="text-xl font-bold mb-4">About your host</h3>
                <div className="flex items-start">
                  {isLoadingHost ? (
                    <Skeleton className="h-14 w-14 rounded-full mr-4" />
                  ) : (
                    <div className="h-14 w-14 rounded-full overflow-hidden mr-4">
                      <img 
                        src={host?.profile?.picture || DEFAULT_PROFILE_IMAGE} 
                        alt="Host" 
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold">{host?.profile?.display_name || 'Host'}</h4>
                    <p className="text-neutral-500 text-sm">Host on NOSTR network</p>
                    <div className="flex items-center mt-1">
                      <div className="flex">
                        <i className="ri-star-fill text-xs mr-1"></i>
                        <span className="text-sm">New Host</span>
                      </div>
                      <span className="mx-2 text-neutral-300">·</span>
                      <div className="flex items-center">
                        <i className="ri-shield-check-line text-xs mr-1"></i>
                        <span className="text-sm">Identity verified</span>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-neutral-600 overflow-hidden text-ellipsis whitespace-nowrap max-w-[90%] flex items-center">
                      NOSTR: {host?.npub ? (
                        <>
                          <span className="inline-block max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap align-bottom" title={host.npub}>
                            {host.npub.substring(0, 10)}...
                          </span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(host.npub);
                              toast({
                                title: "Copied!",
                                description: "NOSTR public key copied to clipboard",
                                variant: "default"
                              });
                            }}
                            className="ml-1 text-primary hover:text-primary/80"
                            title="Copy full NOSTR key"
                          >
                            <i className="ri-file-copy-line text-xs"></i>
                          </button>
                        </>
                      ) : 'Loading...'} 
                      {/* <i className="ri-information-line text-xs cursor-pointer ml-1" title="NOSTR public key"></i> */}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Booking */}
            <div className="md:col-span-1">
              <div className="sticky top-6 border border-neutral-200 rounded-xl p-6 shadow-[0_6px_16px_rgba(0,0,0,0.12)] bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xl font-bold">
                      {listing.content.currency === 'USD' ? '$' : '₿'}{listing.content.price}
                    </span>
                    <span className="text-neutral-500"> {listing.content.currency === 'USD' ? 'USD' : 'BTC'}/night</span>
                  </div>
                  <div className="flex items-center">
                    <i className="ri-star-fill text-xs mr-1"></i>
                    <span className="text-sm">New · <span 
                      className="underline cursor-pointer" 
                      onClick={scrollToComments}
                    >
                      {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                    </span></span>
                  </div>
                </div>

                {/* Booking Form */}
                <div className="border border-neutral-300 rounded-t-lg overflow-hidden">
                  <div className="grid grid-cols-2 border-b border-neutral-300">
                    <div className="p-3 border-r border-neutral-300">
                      <label className="block text-xs font-semibold">CHECK-IN</label>
                      <input 
                        type="date" 
                        value={checkIn} 
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full focus:outline-none text-sm pt-1 bg-transparent"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="p-3">
                      <label className="block text-xs font-semibold">CHECKOUT</label>
                      <input 
                        type="date" 
                        value={checkOut} 
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full focus:outline-none text-sm pt-1 bg-transparent"
                        min={checkIn}
                      />
                    </div>
                  </div>
                  <div className="p-3">
                    <label className="block text-xs font-semibold">GUESTS</label>
                    <div className="flex items-center justify-between">
                      <select 
                        value={guests} 
                        onChange={(e) => setGuests(parseInt(e.target.value))}
                        className="w-full focus:outline-none text-sm pt-1 appearance-none bg-transparent"
                      >
                        {[...Array(listing.content.maxGuests)].map((_, i) => (
                          <option key={i} value={i + 1}>
                            {i + 1} guest{i !== 0 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                      <i className="ri-arrow-down-s-line"></i>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleMessageHost}
                  className="w-full bg-primary hover:bg-primary-600 text-white font-medium py-3 rounded-lg mt-4 transition"
                >
                  <i className="ri-message-2-line mr-2"></i>
                  Message Host
                </Button>
                <p className="text-center text-sm mt-2 text-neutral-500">Send encrypted NOSTR message to host</p>

                {/* Price Details */}
                {checkIn && checkOut && (
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="underline">
                        {listing.content.currency === 'USD' ? '$' : '₿'}{listing.content.price} x {totalNights} night{totalNights !== 1 ? 's' : ''}
                      </span>
                      <span>{listing.content.currency === 'USD' ? '$' : '₿'}{subTotal}</span>
                    </div>
                    <div className="flex justify-between pt-4 border-t border-neutral-200 font-semibold">
                      <span>Approx total</span>
                      <span>{listing.content.currency === 'USD' ? '$' : '₿'}{total}</span>
                    </div>
                  </div>
                )}

                {/* NOSTR Payment Info */}
                <div className="mt-6">
                  <div className="text-sm font-medium mb-2">Pay with NOSTR</div>
                  <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <i className="ri-lightning-fill text-[#FF8A00] mr-2"></i>
                      <span className="text-sm">NOSTR Wallet</span>
                    </div>
                    <span className="text-sm text-[#00A699]">
                      {isConnected ? 'Connected' : 'Not connected'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    Secure, decentralized payments via the lightning network on Nostr. We recommend using OxChat to get in touch with your host and send payments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
