import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NostrListing, NostrUser } from '@/types/nostr';
import { useState, useEffect } from 'react';
import { getUser, sendEncryptedDirectMessage } from '@/lib/nostr';
import { useNostr } from '@/context/nostr-provider';
import { DEFAULT_PROFILE_IMAGE, AMENITIES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import CalendarAvailability from './calendar-availability';

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

  useEffect(() => {
    const loadHostData = async () => {
      if (listing && isOpen) {
        setIsLoadingHost(true);
        try {
          const hostData = await getUser(listing.pubkey);
          setHost(hostData);
        } catch (error) {
          console.error('Error loading host data', error);
        } finally {
          setIsLoadingHost(false);
        }
      }
    };

    loadHostData();
  }, [listing, isOpen]);

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
- Total price: ${listing.content.currency === 'BTC' ? '₿' : 'ϟ'}${total} ${listing.content.currency === 'BTC' ? 'BTC' : 'sats'}

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
  const cleaningFee = Math.round(listing.content.price * 0.3);
  const serviceFee = Math.round(subTotal * 0.1);
  const total = subTotal + cleaningFee + serviceFee;

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const displayedAmenities = listing.content.amenities?.slice(0, 6) || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 flex flex-col">
        <DialogTitle className="sr-only">{listing.content.title}</DialogTitle>
        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="p-2 rounded-full hover:bg-neutral-100 transition" onClick={onClose}>
            <i className="ri-close-line text-lg"></i>
          </Button>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="flex items-center text-sm font-medium hover:underline">
              <i className="ri-share-line mr-1"></i>
              Share
            </Button>
            <Button variant="ghost" className="flex items-center text-sm font-medium hover:underline">
              <i className="ri-heart-3-line mr-1"></i>
              Save
            </Button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-grow overflow-y-auto p-6">
          {/* Listing Title */}
          <h2 className="text-2xl font-bold mb-1">{listing.content.title}</h2>
          <div className="flex items-center mb-4">
            <span className="flex items-center mr-2">
              <i className="ri-star-fill text-xs mr-1"></i>
              <span className="text-sm font-medium">New</span>
            </span>
            <span className="text-sm text-neutral-500 underline">0 reviews</span>
            <span className="mx-2 text-neutral-300">·</span>
            <span className="text-sm text-neutral-500">{listing.content.location}</span>
          </div>

          {/* Photos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-2 mb-8 rounded-xl overflow-hidden">
            <div className="md:col-span-2 md:row-span-2">
              <img 
                src={listing.content.images[0] || ''} 
                alt={listing.content.title} 
                className="h-full w-full object-cover"
              />
            </div>
            {listing.content.images.slice(1, 5).map((image, index) => (
              <div key={index}>
                <img 
                  src={image} 
                  alt={`${listing.content.title} image ${index + 2}`} 
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Left Column - Description */}
            <div className="md:col-span-2">
              {/* Host Info */}
              <div className="flex items-start justify-between pb-6 border-b border-neutral-200">
                <div>
                  <h3 className="text-xl font-bold">
                    {`${listing.content.bedrooms > 1 ? 'Entire' : 'Private'} ${
                      listing.content.bedrooms > 2 ? 'house' : 'apartment'
                    } hosted by ${host?.profile?.name || 'Host'}`}
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
                <div className="flex items-start mb-4">
                  <i className="ri-medal-line text-2xl text-neutral-700 mt-1 mr-4"></i>
                  <div>
                    <h4 className="font-bold">Experienced host</h4>
                    <p className="text-neutral-500">Listings on the NOSTR network.</p>
                  </div>
                </div>
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
                {listing.content.amenities && listing.content.amenities.length > 6 && (
                  <Button 
                    variant="outline"
                    className="mt-4 px-5 py-2 border border-neutral-800 rounded-lg font-semibold hover:bg-neutral-100 transition"
                  >
                    Show all {listing.content.amenities.length} amenities
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
                    <h4 className="font-bold">{host?.profile?.name || 'Host'}</h4>
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
                    <p className="mt-4 text-sm text-neutral-600">
                      NOSTR: {host?.npub || 'Loading...'} 
                      <i className="ri-information-line text-xs cursor-pointer ml-1" title="NOSTR public key"></i>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Booking */}
            <div className="md:col-span-1">
              <div className="sticky top-6 border border-neutral-200 rounded-xl p-6 shadow-[0_6px_16px_rgba(0,0,0,0.12)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xl font-bold">
                      {listing.content.currency === 'BTC' ? '₿' : 'ϟ'}{listing.content.price}
                    </span>
                    <span className="text-neutral-500"> {listing.content.currency === 'BTC' ? 'BTC' : 'sats'}/night</span>
                  </div>
                  <div className="flex items-center">
                    <i className="ri-star-fill text-xs mr-1"></i>
                    <span className="text-sm">New · <span className="underline">0 reviews</span></span>
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
                        className="w-full focus:outline-none text-sm pt-1"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="p-3">
                      <label className="block text-xs font-semibold">CHECKOUT</label>
                      <input 
                        type="date" 
                        value={checkOut} 
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full focus:outline-none text-sm pt-1"
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
                        {listing.content.currency === 'BTC' ? '₿' : 'ϟ'}{listing.content.price} x {totalNights} night{totalNights !== 1 ? 's' : ''}
                      </span>
                      <span>{listing.content.currency === 'BTC' ? '₿' : 'ϟ'}{subTotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="underline">Cleaning fee</span>
                      <span>{listing.content.currency === 'BTC' ? '₿' : 'ϟ'}{cleaningFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="underline">Service fee</span>
                      <span>{listing.content.currency === 'BTC' ? '₿' : 'ϟ'}{serviceFee}</span>
                    </div>
                    <div className="flex justify-between pt-4 border-t border-neutral-200 font-semibold">
                      <span>Total before taxes</span>
                      <span>{listing.content.currency === 'BTC' ? '₿' : 'ϟ'}{total}</span>
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
                    Secure, decentralized payments via the NOSTR network
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
