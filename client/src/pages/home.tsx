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
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  const [listings, setListings] = useState<NostrListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<NostrListing[]>([]);
  const [displayListings, setDisplayListings] = useState<NostrListing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [selectedListing, setSelectedListing] = useState<NostrListing | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNostrModal, setShowNostrModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All homes');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [activeLocation, setActiveLocation] = useState('');
  const [visibleListings, setVisibleListings] = useState(8);
  const [activeTab, setActiveTab] = useState('all');
  const [showCategories, setShowCategories] = useState(false);
  const [filtersKey, setFiltersKey] = useState(0);

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
        console.log(nostrListings);
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
    
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const refreshParam = urlParams.get('refresh');
    const tabParam = urlParams.get('tab');
    
    // Handle refresh parameter
    if (refreshParam) {
      console.log("Refresh parameter detected, reloading listings");
      // Re-fetch listings
      fetchListings();
    }
    
    // Handle tab parameter
    if (tabParam && ['all', 'saved', 'created'].includes(tabParam)) {
      console.log(`Tab parameter detected: ${tabParam}`);
      setActiveTab(tabParam);
    }
  }, []);

  useEffect(() => {
    // Apply filters when listings, activeCategory, activeFilters, or activeLocation change
    let filtered = [...listings];

    // Filter by category
    if (activeCategory !== 'All homes') {
      const categoryKey = activeCategory.toLowerCase();
      console.log(`Filtering by category: ${activeCategory} (${categoryKey})`);
      
      // Find alternative forms of the same category (different case formats)
      // This handles case where stored categories might be in different format
      const possibleCategoryForms = [
        categoryKey,                                // lowercase: beachfront
        categoryKey.toUpperCase(),                  // uppercase: BEACHFRONT
        categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1), // Capitalized: Beachfront
        // Transformed versions in case it got saved with transformations
        categoryKey.replace(/\s+/g, ''),            // No spaces: Beachfront
        categoryKey.replace(/\s+/g, '-'),           // Hyphenated: beach-front
        categoryKey.replace(/\s+/g, '_')            // Underscored: beach_front
      ];
      
      console.log("Will match against any of these category forms:", possibleCategoryForms);
      
      filtered = filtered.filter(listing => {
        let matchFound = false;
        
        // First check content.category array
        if (listing.content.category && Array.isArray(listing.content.category)) {
          console.log(`Listing ${listing.id} has categories:`, listing.content.category);
          const hasCategory = listing.content.category.some(category => {
            const categoryLower = category.toLowerCase();
            // Check if any of our possible forms match this category
            const matchesAnyForm = possibleCategoryForms.some(form => 
              categoryLower === form || categoryLower.includes(form)
            );
            if (matchesAnyForm) console.log(`Category match in content.category: ${category}`);
            return matchesAnyForm;
          });
          if (hasCategory) {
            matchFound = true;
            return true;
          }
        }
        
        // Then check category tags
        const categoryTags = listing.tags.filter(tag => tag[0] === 'category');
        if (categoryTags.length > 0) {
          console.log(`Listing ${listing.id} has category tags:`, categoryTags);
          const hasCategory = categoryTags.some(tag => {
            const tagValueLower = tag[1].toLowerCase();
            // Check if any of our possible forms match this tag
            const matchesAnyForm = possibleCategoryForms.some(form => 
              tagValueLower === form || tagValueLower.includes(form)
            );
            if (matchesAnyForm) console.log(`Category match in category tags: ${tag[1]}`);
            return matchesAnyForm;
          });
          if (hasCategory) {
            matchFound = true;
            return true;
          }
        }
        
        // Finally check t tags (backward compatibility)
        const tTags = listing.tags.filter(tag => tag[0] === 't');
        if (tTags.length > 0) {
          console.log(`Listing ${listing.id} has t tags:`, tTags);
          const hasMatch = tTags.some(tag => {
            const tagValueLower = tag[1].toLowerCase();
            // Check if any of our possible forms match this tag
            const matchesAnyForm = possibleCategoryForms.some(form => 
              tagValueLower === form || tagValueLower.includes(form)
            );
            if (matchesAnyForm) console.log(`Category match in t tags: ${tag[1]}`);
            return matchesAnyForm;
          });
          matchFound = hasMatch;
          return hasMatch;
        }
        
        if (!matchFound) {
          console.log(`No category match for listing ${listing.id}`);
        }
        return matchFound;
      });
      
      console.log(`After category filtering: ${filtered.length} listings match`);
    }

    // Apply additional filters
    if (activeFilters) {
      // Apply amenity filters
      if (activeFilters.activeFilters && activeFilters.activeFilters.length > 0) {
        const filters = activeFilters.activeFilters;
        
        if (filters.includes('wifi')) {
          filtered = filtered.filter(listing => {
            // Check amenities array
            if (listing.content.amenities?.some(amenity => 
              amenity.toLowerCase() === 'wifi' || amenity.toLowerCase().includes('wifi')
            )) {
              return true;
            }
            // Check tags
            return listing.tags.some(tag => 
              tag[0] === 'amenity' && 
              (tag[1].toLowerCase() === 'wifi' || tag[1].toLowerCase().includes('wifi'))
            );
          });
        }
        
        if (filters.includes('selfCheckin')) {
          filtered = filtered.filter(listing => {
            // Check amenities array
            if (listing.content.amenities?.some(amenity => 
              amenity.toLowerCase() === 'self check-in' || amenity.toLowerCase().includes('check-in')
            )) {
              return true;
            }
            // Check tags
            return listing.tags.some(tag => 
              tag[0] === 'amenity' && 
              (tag[1].toLowerCase() === 'self check-in' || tag[1].toLowerCase().includes('check-in'))
            );
          });
        }
        
        if (filters.includes('ac')) {
          filtered = filtered.filter(listing => {
            // Check amenities array
            if (listing.content.amenities?.some(amenity => 
              amenity.toLowerCase() === 'air conditioning' || 
              amenity.toLowerCase().includes('ac') || 
              amenity.toLowerCase().includes('a/c')
            )) {
              return true;
            }
            // Check tags
            return listing.tags.some(tag => 
              tag[0] === 'amenity' && 
              (tag[1].toLowerCase() === 'air conditioning' || 
               tag[1].toLowerCase().includes('ac') || 
               tag[1].toLowerCase().includes('a/c'))
            );
          });
        }
        
        if (filters.includes('kitchen')) {
          filtered = filtered.filter(listing => {
            // Check amenities array
            if (listing.content.amenities?.some(amenity => 
              amenity.toLowerCase() === 'kitchen' || amenity.toLowerCase().includes('kitchen')
            )) {
              return true;
            }
            // Check tags
            return listing.tags.some(tag => 
              tag[0] === 'amenity' && 
              (tag[1].toLowerCase() === 'kitchen' || tag[1].toLowerCase().includes('kitchen'))
            );
          });
        }
        
        if (filters.includes('smoking')) {
          filtered = filtered.filter(listing => {
            // Check amenities array
            if (listing.content.amenities?.some(amenity => 
              amenity.toLowerCase() === 'smoking allowed' || amenity.toLowerCase().includes('smoking')
            )) {
              return true;
            }
            // Check tags
            return listing.tags.some(tag => 
              tag[0] === 'amenity' && 
              (tag[1].toLowerCase() === 'smoking allowed' || tag[1].toLowerCase().includes('smoking'))
            );
          });
        }
        
        if (filters.includes('pets')) {
          filtered = filtered.filter(listing => {
            // Check amenities array
            if (listing.content.amenities?.some(amenity => 
              amenity.toLowerCase() === 'pets allowed' || 
              amenity.toLowerCase().includes('pet') || 
              amenity.toLowerCase().includes('dog') || 
              amenity.toLowerCase().includes('cat')
            )) {
              return true;
            }
            // Check tags
            return listing.tags.some(tag => 
              tag[0] === 'amenity' && 
              (tag[1].toLowerCase() === 'pets allowed' || 
               tag[1].toLowerCase().includes('pet') || 
               tag[1].toLowerCase().includes('dog') || 
               tag[1].toLowerCase().includes('cat'))
            );
          });
        }
        
        if (filters.includes('cancellation')) {
          filtered = filtered.filter(listing => {
            // Check amenities array
            if (listing.content.amenities?.some(amenity => 
              amenity.toLowerCase().includes('free cancellation') || 
              amenity.toLowerCase().includes('cancellation')
            )) {
              return true;
            }
            // Check description
            if (listing.content.description && 
               listing.content.description.toLowerCase().includes('free cancellation')) {
              return true;
            }
            // Check tags
            return listing.tags.some(tag => 
              tag[0] === 'amenity' && 
              (tag[1].toLowerCase().includes('free cancellation') || 
               tag[1].toLowerCase().includes('cancellation'))
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
          // First try to match against the type array if available
          if (listing.content.type && Array.isArray(listing.content.type)) {
            return listing.content.type.some(type =>
              type.toLowerCase() === activeFilters.propertyType.toLowerCase()
            );
          }
          
          // Next check for type in tags
          const typeTags = listing.tags.filter(tag => tag[0] === 'type');
          if (typeTags.length > 0) {
            return typeTags.some(tag => 
              tag[1].toLowerCase() === activeFilters.propertyType.toLowerCase()
            );
          }
          
          // Fall back to matching against description or title
          const content = (listing.content.description || '') + ' ' + (listing.content.title || '');
          return content.toLowerCase().includes(activeFilters.propertyType.toLowerCase());
        });
      }
      
      // Apply stay type filter
      if (activeFilters.stayType) {
        filtered = filtered.filter(listing => {
          // First try to match against the type array if available
          if (listing.content.type && Array.isArray(listing.content.type)) {
            return listing.content.type.some(type =>
              type.toLowerCase() === activeFilters.stayType.toLowerCase()
            );
          }
          
          // Next check for type in tags
          const typeTags = listing.tags.filter(tag => tag[0] === 'type');
          if (typeTags.length > 0) {
            return typeTags.some(tag => 
              tag[1].toLowerCase() === activeFilters.stayType.toLowerCase()
            );
          }
          
          // Fall back to matching against description or title
          const content = (listing.content.description || '') + ' ' + (listing.content.title || '');
          return content.toLowerCase().includes(activeFilters.stayType.toLowerCase());
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
  
  // Update displayed listings when the active tab or filtered listings change
  useEffect(() => {
    if (isLoadingListings) return;
    
    switch(activeTab) {
      case 'saved':
        setDisplayListings(filterUserSavedListings(listings));
        break;
      case 'created':
        setDisplayListings(filterUserCreatedListings(listings));
        break;
      case 'all':
      default:
        setDisplayListings(filteredListings);
        break;
    }
  }, [activeTab, filteredListings, listings, isLoadingListings]);
  
  const handleLocationChange = (location: string) => {
    setActiveLocation(location);
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };

  const handleFilterChange = (filters: Record<string, any>) => {
    setActiveFilters(filters);
  };

  // Function to clear all filters
  const clearAllFilters = () => {
    // Reset parent component state
    setActiveCategory('All homes');
    setActiveFilters({
      activeFilters: [],
      priceRange: [0, 1000000],
      propertyType: null,
      stayType: null
    });
    setActiveLocation('');
    
    // Force a re-render of the Filters component by passing a key
    setFiltersKey(prev => prev + 1);
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

  // Function to toggle category visibility
  const toggleCategoriesVisibility = () => {
    setShowCategories(prevShow => !prevShow);
  };

  // Render tab title based on activeTab
  const getTabTitle = () => {
    switch(activeTab) {
      case 'saved': return 'Saved Listings';
      case 'created': return 'Your Listings';
      case 'all': 
      default: return 'All Listings';
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header onLocationChange={handleLocationChange} />

      {/* Full-width filter/category bar */}
      <div className="w-full border-b mb-0">
        <div className="mx-auto px-0 py-0">
          {/* Conditionally render CategoryFilter */}
          {showCategories && (
            <CategoryFilter 
              onCategoryChange={handleCategoryChange} 
              activeCategory={activeCategory}
            />
          )}
          <Filters 
            key={filtersKey}
            onFilterChange={handleFilterChange} 
            showCategories={showCategories} 
            onToggleCategories={toggleCategoriesVisibility}
            onResetFilters={clearAllFilters}
          />
        </div>
      </div>

      <main className="flex-grow py-0 w-full">
      <NostrConnectionInfo onConnectClick={openNostrModal} />

        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4">
          <div className="flex flex-col justify-between items-start mb-4 gap-0 w-full">
            <div className="flex flex-col w-full gap-4">
              {/* Title + refresh row: always rendered with min-height so layout doesn't jump when loading or when there are no listings */}
              <div className="flex items-center justify-between w-full min-h-[3.25rem] mt-4 px-0 shrink-0">
                <h2 className="text-xl font-semibold">{getTabTitle()}</h2>
                <Button
                  variant="outline"
                  onClick={fetchListings}
                  disabled={isLoadingListings}
                  className="flex items-center bg-white shrink-0"
                  size="sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isLoadingListings ? "Refreshing..." : "Refresh"}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-0 w-full">
                {isLoadingListings ? (
                  // Show centered spinner while loading
                  <div className="col-span-full flex justify-center items-center py-40">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : displayListings.length > 0 ? (
                  // Show filtered listings
                  displayListings.slice(0, visibleListings).map((listing) => (
                    <ListingCard 
                      key={listing.id} 
                      listing={listing} 
                      onClick={handleListingClick} 
                    />
                  ))
                ) : (
                  // No listings found
                  <div className="col-span-full text-center py-12">
                    <h3 className="text-xl font-semibold mb-2">
                      {activeTab === 'saved' ? 'No saved listings' : 
                       activeTab === 'created' ? 'No listings created' : 
                       'No listings found'}
                    </h3>
                    <p className="text-neutral-500 mb-6">
                      {activeTab === 'saved' ? 'Click the heart icon on any listing to save it for later.' : 
                       activeTab === 'created' ? 'Properties you create will appear here for easy access.' : 
                       'We couldn\'t find any listings matching your criteria. Try adjusting your filters.'}
                    </p>
                    {activeTab === 'created' ? (
                      <Button asChild>
                        <a href="/listing">Create a listing</a>
                      </Button>
                    ) : activeTab === 'saved' ? (
                      <Button 
                        variant="outline"
                        onClick={() => {
                          window.location.href = '/?tab=all';
                        }}
                      >
                        Browse properties
                      </Button>
                    ) : (
                      <Button 
                        variant="outline"
                        onClick={clearAllFilters}
                        className='bg-white'
                      >
                        Clear all filters
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Show More Button */}
          {displayListings.length > visibleListings && (
            <div className="mt-10 text-center">
              <Button 
                variant="outline"
                className="inline-flex items-center justify-center px-6 py-3 border border-orange-400 rounded-lg text-base font-medium bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold shadow-sm hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 transition"
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