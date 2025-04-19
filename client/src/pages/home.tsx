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
import { filterUserCreatedListings, filterUserViewedListings, filterUserSavedListings } from '@/lib/user-history';
import { NostrListing } from '@/types/nostr';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  // Function to fetch listings that can be called multiple times
  const fetchListings = async () => {
    setIsLoadingListings(true);
    try {
      console.log("Fetching listings from NOSTR network...");
      const nostrListings = await getListings();
      // If we didn't get any NOSTR listings, create a fallback message
      if (nostrListings.length === 0) {
        setListings([]);
        console.log("No listings found from NOSTR network");
      } else {
        console.log(`Found ${nostrListings.length} listings from NOSTR network`);
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

  // Initial fetch and refresh based on URL parameters
  useEffect(() => {
    fetchListings();
    
    // Check if there's a refresh parameter in the URL to force refresh listings
    const urlParams = new URLSearchParams(window.location.search);
    const refreshParam = urlParams.get('refresh');
    
    if (refreshParam) {
      // Clear the parameter so refreshes don't happen on every render
      // Replace the current URL without the refresh parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      console.log("Refresh parameter detected, reloading listings");
      // Re-fetch listings
      fetchListings();
    }
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
    if (activeFilters) {
      // Apply amenity filters
      if (activeFilters.activeFilters && activeFilters.activeFilters.length > 0) {
        const filters = activeFilters.activeFilters;
        
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
      
      // Apply price range filter
      if (activeFilters.priceRange) {
        const [minPrice, maxPrice] = activeFilters.priceRange;
        filtered = filtered.filter(listing => {
          const price = listing.content.price || 0;
          return price >= minPrice && price <= maxPrice;
        });
      }
      
      // Apply property type filter
      if (activeFilters.propertyType) {
        filtered = filtered.filter(listing => {
          // Match property type with the listing description or title since we don't have a direct property type field
          const content = (listing.content.description || '') + ' ' + (listing.content.title || '');
          return content.toLowerCase().includes(activeFilters.propertyType.toLowerCase());
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
      
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <CategoryFilter onCategoryChange={handleCategoryChange} />
              <Button 
                variant="outline" 
                onClick={fetchListings} 
                disabled={isLoadingListings} 
                className="flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isLoadingListings ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Filters onFilterChange={handleFilterChange} />
              <NostrConnectionInfo onConnectClick={openNostrModal} />
            </div>
          </div>
          
          {/* Listings Tabs */}
          <Tabs defaultValue="all" className="mb-8">
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Listings</TabsTrigger>
              <TabsTrigger value="viewed">Recently Viewed</TabsTrigger>
              <TabsTrigger value="saved">Saved</TabsTrigger>
              <TabsTrigger value="created">Your Listings</TabsTrigger>
            </TabsList>
            
            {/* All Listings Tab */}
            <TabsContent value="all">
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
            </TabsContent>
            
            {/* Recently Viewed Tab */}
            <TabsContent value="viewed">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoadingListings ? (
                  // Show skeletons while loading
                  Array(4).fill(0).map((_, index) => (
                    <ListingCardSkeleton key={index} />
                  ))
                ) : (() => {
                  const viewedListings = filterUserViewedListings(listings);
                  return viewedListings.length > 0 ? (
                    // Show viewed listings
                    viewedListings.map((listing) => (
                      <ListingCard 
                        key={listing.id} 
                        listing={listing} 
                        onClick={handleListingClick} 
                      />
                    ))
                  ) : (
                    // No viewed listings
                    <div className="col-span-full text-center py-12">
                      <h3 className="text-xl font-semibold mb-2">No recent views</h3>
                      <p className="text-neutral-500 mb-6">
                        Properties you view will appear here so you can easily find them again.
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          const tabAll = document.querySelector('[data-value="all"]') as HTMLElement;
                          if (tabAll) tabAll.click();
                        }}
                      >
                        Browse properties
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </TabsContent>
            
            {/* Saved Listings Tab */}
            <TabsContent value="saved">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoadingListings ? (
                  // Show skeletons while loading
                  Array(4).fill(0).map((_, index) => (
                    <ListingCardSkeleton key={index} />
                  ))
                ) : (() => {
                  const savedListings = filterUserSavedListings(listings);
                  return savedListings.length > 0 ? (
                    // Show saved listings
                    savedListings.map((listing) => (
                      <ListingCard 
                        key={listing.id} 
                        listing={listing} 
                        onClick={handleListingClick} 
                      />
                    ))
                  ) : (
                    // No saved listings
                    <div className="col-span-full text-center py-12">
                      <h3 className="text-xl font-semibold mb-2">No saved listings</h3>
                      <p className="text-neutral-500 mb-6">
                        Click the heart icon on any listing to save it for later.
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          const tabAll = document.querySelector('[data-value="all"]') as HTMLElement;
                          if (tabAll) tabAll.click();
                        }}
                      >
                        Browse properties
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </TabsContent>
            
            {/* Your Listings Tab */}
            <TabsContent value="created">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoadingListings ? (
                  // Show skeletons while loading
                  Array(4).fill(0).map((_, index) => (
                    <ListingCardSkeleton key={index} />
                  ))
                ) : (() => {
                  const createdListings = filterUserCreatedListings(listings);
                  return createdListings.length > 0 ? (
                    // Show created listings
                    createdListings.map((listing) => (
                      <ListingCard 
                        key={listing.id} 
                        listing={listing} 
                        onClick={handleListingClick} 
                      />
                    ))
                  ) : (
                    // No created listings
                    <div className="col-span-full text-center py-12">
                      <h3 className="text-xl font-semibold mb-2">No listings created</h3>
                      <p className="text-neutral-500 mb-6">
                        Properties you create will appear here for easy access.
                      </p>
                      <Button asChild>
                        <a href="/listing">Create a listing</a>
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </TabsContent>
          </Tabs>

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
