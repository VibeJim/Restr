import { useState, useEffect } from 'react';
import Header from '@/components/header';
import CategoryFilter from '@/components/category-filter';
import Filters from '@/components/filters';
import NostrConnectionInfo from '@/components/nostr-connection-info';
import Footer from '@/components/footer';
import ListingCard, { ListingCardSkeleton } from '@/components/listing-card';
import ListingDetailModal from '@/components/listing-detail-modal';
import NostrConnectModal from '@/components/nostr-connect-modal';
import { getListings } from '@/lib/nostr';
import { NostrListing } from '@/types/nostr';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [listings, setListings] = useState<NostrListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<NostrListing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [selectedListing, setSelectedListing] = useState<NostrListing | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNostrModal, setShowNostrModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All homes');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [activeLocation, setActiveLocation] = useState('');
  const [visibleListings, setVisibleListings] = useState(8);

  useEffect(() => {
    const fetchListings = async () => {
      setIsLoadingListings(true);
      try {
        const nostrListings = await getListings();
        // If we didn't get any NOSTR listings, create a fallback message
        if (nostrListings.length === 0) {
          setListings([]);
        } else {
          setListings(nostrListings);
          setFilteredListings(nostrListings);
        }
      } catch (error) {
        console.error('Error fetching listings:', error);
        setListings([]);
      } finally {
        setIsLoadingListings(false);
      }
    };

    fetchListings();
  }, []);

  useEffect(() => {
    // Apply filters when listings, activeCategory, activeFilters, or activeLocation change
    let filtered = [...listings];

    // Filter by category
    if (activeCategory !== 'All homes') {
      const categoryKey = activeCategory.toLowerCase();
      filtered = filtered.filter(listing => {
        // Check if listing has a category tag that matches
        const categoryTags = listing.tags.filter(tag => tag[0] === 't');
        return categoryTags.some(tag => tag[1].toLowerCase().includes(categoryKey));
      });
    }

    // Apply additional filters
    if (activeFilters.activeFilters && activeFilters.activeFilters.length > 0) {
      const filters = activeFilters.activeFilters;
      
      // Example filters - in a real app these would be more sophisticated
      if (filters.includes('wifi')) {
        filtered = filtered.filter(listing => {
          return listing.content.amenities?.some(amenity => 
            amenity.toLowerCase() === 'wifi' || amenity.toLowerCase().includes('wifi')
          );
        });
      }
      
      if (filters.includes('selfCheckin')) {
        filtered = filtered.filter(listing => {
          return listing.content.amenities?.some(amenity => 
            amenity.toLowerCase() === 'self check-in' || amenity.toLowerCase().includes('check-in')
          );
        });
      }
    }

    // Filter by location
    if (activeLocation) {
      filtered = filtered.filter(listing => {
        const listingLocation = listing.content.location || '';
        return listingLocation.toLowerCase().includes(activeLocation.toLowerCase().replace('-', ' '));
      });
    }

    setFilteredListings(filtered);
  }, [listings, activeCategory, activeFilters, activeLocation]);
  
  const handleLocationChange = (location: string) => {
    setActiveLocation(location);
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };

  const handleFilterChange = (filters: Record<string, any>) => {
    setActiveFilters(filters);
  };

  const handleListingClick = (listing: NostrListing) => {
    setSelectedListing(listing);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
  };

  const openNostrModal = () => {
    setShowNostrModal(true);
  };

  const closeNostrModal = () => {
    setShowNostrModal(false);
  };

  const loadMoreListings = () => {
    setVisibleListings(prevValue => prevValue + 8);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header onLocationChange={handleLocationChange} />
      <CategoryFilter onCategoryChange={handleCategoryChange} />
      <Filters onFilterChange={handleFilterChange} />
      <NostrConnectionInfo onConnectClick={openNostrModal} />
      
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Listings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoadingListings ? (
              // Show skeletons while loading
              Array(8).fill(0).map((_, index) => (
                <ListingCardSkeleton key={index} />
              ))
            ) : filteredListings.length > 0 ? (
              // Show filtered listings
              filteredListings.slice(0, visibleListings).map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing} 
                  onClick={handleListingClick} 
                />
              ))
            ) : (
              // No listings found
              <div className="col-span-full text-center py-12">
                <h3 className="text-xl font-semibold mb-2">No listings found</h3>
                <p className="text-neutral-500 mb-6">
                  We couldn't find any listings matching your criteria. Try adjusting your filters.
                </p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setActiveCategory('All homes');
                    setActiveFilters({});
                    setActiveLocation('');
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </div>

          {/* Show More Button */}
          {filteredListings.length > visibleListings && (
            <div className="mt-10 text-center">
              <Button 
                variant="outline"
                className="inline-flex items-center justify-center px-6 py-3 border border-neutral-300 rounded-lg text-base font-medium hover:bg-neutral-50 transition"
                onClick={loadMoreListings}
              >
                Show more listings
                <i className="ri-arrow-down-line ml-2"></i>
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <ListingDetailModal 
        isOpen={showDetailModal} 
        onClose={closeDetailModal} 
        listing={selectedListing} 
      />
      
      <NostrConnectModal 
        isOpen={showNostrModal} 
        onClose={closeNostrModal} 
      />
    </div>
  );
}
