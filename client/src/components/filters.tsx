import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

// Helper function to format numbers with commas
const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

interface FiltersProps {
  onFilterChange: (filters: Record<string, any>) => void;
  showCategories: boolean;
  onToggleCategories: () => void;
  onResetFilters?: () => void; // Callback for when filters are reset
}

export default function Filters({ 
  onFilterChange, 
  showCategories, 
  onToggleCategories,
  onResetFilters
}: FiltersProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [isTypePopoverOpen, setIsTypePopoverOpen] = useState(false);
  const [isStayTypePopoverOpen, setIsStayTypePopoverOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [propertyType, setPropertyType] = useState<string | null>(null);
  const [stayType, setStayType] = useState<string | null>(null);
  const isMounted = useRef(false);

  // Reset all filters to their default values
  const resetAllFilters = () => {
    setActiveFilters([]);
    setPriceRange([0, 1000000]);
    setPropertyType(null);
    setStayType(null);
    
    // Notify parent component
    if (onResetFilters) {
      onResetFilters();
    }
  };

  useEffect(() => {
    if (isMounted.current) {
      const updatedFilters: Record<string, any> = { activeFilters };
      
      if (priceRange[0] > 0 || priceRange[1] < 1000000) {
        updatedFilters.priceRange = priceRange;
      }
      
      if (propertyType) {
        updatedFilters.propertyType = propertyType;
      }
      
      if (stayType) {
        updatedFilters.stayType = stayType;
      }
      
      onFilterChange(updatedFilters);
    } else {
      isMounted.current = true;
    }
  }, [activeFilters, priceRange, propertyType, stayType]);

  const toggleFilter = (filter: string) => {
    // Immediately update state with callback to ensure we have the latest state
    setActiveFilters(prevFilters => {
      if (prevFilters.includes(filter)) {
        return prevFilters.filter(f => f !== filter);
      } else {
        return [...prevFilters, filter];
      }
    });
  };
  
  const handlePriceClick = () => {
    setIsPriceDialogOpen(true);
  };
  
  const handleTypeClick = () => {
    setIsTypePopoverOpen(!isTypePopoverOpen);
  };

  const handleStayTypeClick = () => {
    setIsStayTypePopoverOpen(!isStayTypePopoverOpen);
  };

  return (
    <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50/50 to-orange-50/50 shadow-sm">
      <div className="container mx-auto max-w-6xl px-0 sm:px-0 lg:px-0">
        <div className="py-3 flex items-center space-x-2 overflow-x-auto hide-scrollbar px-3">
          <Button 
            variant="outline"
            size="icon"
            className="inline-flex items-center justify-center p-2 border border-neutral-300 rounded-lg hover:border-neutral-400 transition bg-white"
            onClick={onToggleCategories}
            title={showCategories ? "Hide categories" : "Show categories"}
          >
            <i className={showCategories ? "ri-arrow-down-s-line" : "ri-arrow-up-s-line"}></i>
          </Button>

          {/* <Button 
            variant="outline" 
            className="inline-flex items-center px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium hover:border-neutral-400 transition"
          >
            <i className="ri-equalizer-line mr-2"></i>
            Filters
          </Button> */}
          
          {/* Price Button and Dialog */}
          <div>
            <Button 
              variant="outline"
              className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium ${
                priceRange[0] > 0 || priceRange[1] < 1000000
                  ? 'border-orange-400 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold shadow-sm' 
                  : 'border-neutral-300 hover:border-amber-400 bg-white hover:bg-amber-50/50'
              }`}
              onClick={handlePriceClick}
            >
              <span>
                {priceRange[0] > 0 || priceRange[1] < 1000000 
                  ? `ϟ${formatNumber(priceRange[0])} - ϟ${formatNumber(priceRange[1])}`
                  : 'Price (sats)'
                }
              </span>
              <i className="ri-arrow-down-s-line ml-1"></i>
            </Button>
            
            <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogTitle>Price range (satoshis)</DialogTitle>
                <div className="py-6">
                  <div className="flex justify-between mb-4">
                    <div className="p-4 border rounded-lg">
                      <span className="block text-xs text-neutral-500">min price (sats)</span>
                      <div className="text-lg font-medium">ϟ {formatNumber(priceRange[0])}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <span className="block text-xs text-neutral-500">max price (sats)</span>
                      <div className="text-lg font-medium">ϟ {formatNumber(priceRange[1])}</div>
                    </div>
                  </div>
                  
                  <Slider 
                    value={[priceRange[0], priceRange[1]]}
                    min={0}
                    max={1000000}
                    step={1000}
                    minStepsBetweenThumbs={1}
                    onValueChange={(value) => setPriceRange([value[0], value[1]])}
                    className="my-6"
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="h-1 w-1 bg-neutral-400 rounded-full"></div>
                    <div className="h-1 w-1 bg-neutral-400 rounded-full"></div>
                  </div>
                  
                  <p className="text-xs text-neutral-500 mt-4 text-center">
                    Approx. USD: ${(priceRange[0] * 0.001).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - ${(priceRange[1] * 0.001).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <br />
                    <span className="text-neutral-400">Based on 1 BTC = $100,000 USD</span>
                  </p>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setPriceRange([0, 1000000]);
                      setIsPriceDialogOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                  <Button onClick={() => setIsPriceDialogOpen(false)}>
                    Apply
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Type of Place Popover */}
          <Popover open={isTypePopoverOpen} onOpenChange={setIsTypePopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline"
                className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium ${
                  propertyType 
                    ? 'border-orange-400 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold shadow-sm' 
                    : 'border-neutral-300 hover:border-amber-400 bg-white hover:bg-amber-50/50'
                }`}
                onClick={handleTypeClick}
              >
                <span>{propertyType || 'Type of place'}</span>
                <i className="ri-arrow-down-s-line ml-1"></i>
              </Button>
            </PopoverTrigger>
            
            <PopoverContent className="w-64 p-0" align="start">
              <div className="py-2">
                {['Entire home', 'Private room', 'Shared room', 'Hotel'].map((type) => (
                  <button
                    key={type}
                    className={`w-full px-4 py-2 text-left hover:bg-neutral-100 ${
                      propertyType === type ? 'bg-neutral-200 font-medium' : ''
                    }`}
                    onClick={() => {
                      setPropertyType(type);
                      setIsTypePopoverOpen(false);
                    }}
                  >
                    {type}
                  </button>
                ))}
                <div className="border-t border-neutral-200 mt-2 pt-2 px-4">
                  <button
                    className="text-sm text-neutral-500 hover:text-neutral-800"
                    onClick={() => {
                      setPropertyType(null);
                      setIsTypePopoverOpen(false);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {/* Type of Stay Popover */}
          <Popover open={isStayTypePopoverOpen} onOpenChange={setIsStayTypePopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline"
                className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium ${
                  stayType 
                    ? 'border-orange-400 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold shadow-sm' 
                    : 'border-neutral-300 hover:border-amber-400 bg-white hover:bg-amber-50/50'
                }`}
                onClick={handleStayTypeClick}
              >
                <span>{stayType || 'Type of stay'}</span>
                <i className="ri-arrow-down-s-line ml-1"></i>
              </Button>
            </PopoverTrigger>
            
            <PopoverContent className="w-64 p-0" align="start">
              <div className="py-2">
                {['Short term', 'Long term', 'Sublet'].map((type) => (
                  <button
                    key={type}
                    className={`w-full px-4 py-2 text-left hover:bg-neutral-100 ${
                      stayType === type ? 'bg-neutral-200 font-medium' : ''
                    }`}
                    onClick={() => {
                      setStayType(type);
                      setIsStayTypePopoverOpen(false);
                    }}
                  >
                    {type}
                  </button>
                ))}
                <div className="border-t border-neutral-200 mt-2 pt-2 px-4">
                  <button
                    className="text-sm text-neutral-500 hover:text-neutral-800"
                    onClick={() => {
                      setStayType(null);
                      setIsStayTypePopoverOpen(false);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="outline"
            className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium ${
              activeFilters.includes('cancellation') 
                ? 'border-orange-400 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold shadow-sm' 
                : 'border-neutral-300 hover:border-amber-400 bg-white hover:bg-amber-50/50'
            }`}
            onClick={() => toggleFilter('cancellation')}
          >
            <span>Free cancellation</span>
          </Button>
          
          <Button 
            variant="outline"
            className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium ${
              activeFilters.includes('wifi') 
                ? 'border-orange-400 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold shadow-sm' 
                : 'border-neutral-300 hover:border-amber-400 bg-white hover:bg-amber-50/50'
            }`}
            onClick={() => toggleFilter('wifi')}
          >
            <span>Wifi</span>
          </Button>
          
          <Button 
            variant="outline"
            className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium ${
              activeFilters.includes('selfCheckin') 
                ? 'border-orange-400 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold shadow-sm' 
                : 'border-neutral-300 hover:border-amber-400 bg-white hover:bg-amber-50/50'
            }`}
            onClick={() => toggleFilter('selfCheckin')}
          >
            <span>Self check-in</span>
          </Button>

          <Button 
            variant="outline"
            className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium ${
              activeFilters.includes('ac') 
                ? 'border-orange-400 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold shadow-sm' 
                : 'border-neutral-300 hover:border-amber-400 bg-white hover:bg-amber-50/50'
            }`}
            onClick={() => toggleFilter('ac')}
          >
            <span>AC</span>
          </Button>

          <Button 
            variant="outline"
            className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium ${
              activeFilters.includes('kitchen') 
                ? 'border-orange-400 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold shadow-sm' 
                : 'border-neutral-300 hover:border-amber-400 bg-white hover:bg-amber-50/50'
            }`}
            onClick={() => toggleFilter('kitchen')}
          >
            <span>Kitchen</span>
          </Button>

          <Button 
            variant="outline"
            className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium ${
              activeFilters.includes('smoking') 
                ? 'border-orange-400 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold shadow-sm' 
                : 'border-neutral-300 hover:border-amber-400 bg-white hover:bg-amber-50/50'
            }`}
            onClick={() => toggleFilter('smoking')}
          >
            <span>Smoking</span>
          </Button>

          <Button 
            variant="outline"
            className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium ${
              activeFilters.includes('pets') 
                ? 'border-orange-400 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold shadow-sm' 
                : 'border-neutral-300 hover:border-amber-400 bg-white hover:bg-amber-50/50'
            }`}
            onClick={() => toggleFilter('pets')}
          >
            <span>Pets</span>
          </Button>

          {/* Clear all filters button - only show if there are active filters */}
          {(activeFilters.length > 0 || priceRange[0] > 0 || priceRange[1] < 1000000 || propertyType || stayType) && (
            <Button 
              variant="outline"
              className="inline-flex items-center px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium bg-white hover:bg-amber-50/50 hover:border-amber-400 ml-2"
              onClick={resetAllFilters}
            >
              <i className="ri-close-line mr-1"></i>
              <span>Clear all</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Store full listing objects in localStorage
export const saveListing = (listing: NostrListing): void => {
  try {
    // Get current saved listings
    const history = getUserHistory();
    
    // Get saved listing objects from storage
    const savedListingsObjsJson = localStorage.getItem('restr_saved_listings_data');
    let savedListingsObjs: Record<string, NostrListing> = savedListingsObjsJson ? 
      JSON.parse(savedListingsObjsJson) : {};
    
    // Add the listing ID if it doesn't exist
    if (!history.savedListings?.includes(listing.id)) {
      if (!history.savedListings) {
        history.savedListings = [];
      }
      // Add to the beginning for most recent first
      history.savedListings.unshift(listing.id);
      
      // Save updated history
      localStorage.setItem(USER_SAVED_LISTINGS_KEY, JSON.stringify(history.savedListings));
      
      // Save the full listing object
      savedListingsObjs[listing.id] = listing;
      localStorage.setItem('restr_saved_listings_data', JSON.stringify(savedListingsObjs));
      
      console.log(`Listing ${listing.id} saved to favorites`);
      
      // Show the notice if this is the first time or hasn't been shown recently
      const noticeKey = 'restr_saved_notice_shown_recently';
      const lastShown = localStorage.getItem(noticeKey);
      const currentTime = Date.now();
      
      // Only show notice if it hasn't been shown in the last 24 hours
      if (!lastShown || (currentTime - parseInt(lastShown, 10)) > 24 * 60 * 60 * 1000) {
        localStorage.setItem(noticeKey, currentTime.toString());
        localStorageNoticeState.setSavedListingsNoticeVisible(true);
      }
    }
  } catch (error) {
    console.error('Error saving listing to favorites:', error);
  }
};

// Update the filter function to use the cached data
export const filterUserSavedListings = (listings: NostrListing[]): NostrListing[] => {
  const history = getUserHistory();
  
  // Try to get saved listings from cache first
  try {
    const savedListingsObjsJson = localStorage.getItem('restr_saved_listings_data');
    if (savedListingsObjsJson) {
      const savedListingsObjs: Record<string, NostrListing> = JSON.parse(savedListingsObjsJson);
      
      // Return listings in the order they were saved
      return (history.savedListings || [])
        .map(id => savedListingsObjs[id])
        .filter(listing => !!listing);
    }
  } catch (error) {
    console.error('Error retrieving cached listings:', error);
  }
  
  // Fall back to filtering from provided listings if cache fails
  const listingMap = new Map<string, NostrListing>();
  listings.forEach(listing => listingMap.set(listing.id, listing));
  
  return (history.savedListings || [])
    .map(id => listingMap.get(id))
    .filter((listing): listing is NostrListing => !!listing);
};

export const unsaveListing = (listingId: string): void => {
  try {
    // Get current saved listings
    const history = getUserHistory();
    
    // If there are no saved listings or the listing isn't saved, do nothing
    if (!history.savedListings || !history.savedListings.includes(listingId)) {
      return;
    }
    
    // Remove the listing ID
    history.savedListings = history.savedListings.filter(id => id !== listingId);
    
    // Save updated history
    localStorage.setItem(USER_SAVED_LISTINGS_KEY, JSON.stringify(history.savedListings));
    
    // Also remove from cached objects
    try {
      const savedListingsObjsJson = localStorage.getItem('restr_saved_listings_data');
      if (savedListingsObjsJson) {
        const savedListingsObjs: Record<string, NostrListing> = JSON.parse(savedListingsObjsJson);
        delete savedListingsObjs[listingId];
        localStorage.setItem('restr_saved_listings_data', JSON.stringify(savedListingsObjs));
      }
    } catch (error) {
      console.error('Error updating cached listings:', error);
    }
    
    console.log(`Listing ${listingId} removed from favorites`);
  } catch (error) {
    console.error('Error removing listing from favorites:', error);
  }
};

// Modified saveCreatedListing function to cache the full listing data
export const saveCreatedListing = (listing: NostrListing): void => {
  try {
    // Get current created listings
    const history = getUserHistory();
    
    // Get created listing objects from storage
    const createdListingsObjsJson = localStorage.getItem('restr_created_listings_data');
    let createdListingsObjs: Record<string, NostrListing> = createdListingsObjsJson ? 
      JSON.parse(createdListingsObjsJson) : {};
    
    // Add the listing ID if it doesn't exist
    if (!history.createdListings.includes(listing.id)) {
      history.createdListings.push(listing.id);
      
      // Save updated history
      localStorage.setItem(USER_CREATED_LISTINGS_KEY, JSON.stringify(history.createdListings));
      
      // Save the full listing object
      createdListingsObjs[listing.id] = listing;
      localStorage.setItem('restr_created_listings_data', JSON.stringify(createdListingsObjs));
      
      console.log(`Listing ${listing.id} saved to created listings`);
      
      // Show the notice 
      const noticeKey = 'restr_created_notice_shown_recently';
      const lastShown = localStorage.getItem(noticeKey);
      const currentTime = Date.now();
      
      // Always show notice for created listings
      localStorage.setItem(noticeKey, currentTime.toString());
      localStorageNoticeState.setCreatedListingsNoticeVisible(true);
    }
  } catch (error) {
    console.error('Error saving created listing to history:', error);
  }
};

// Modified filterUserCreatedListings function to use cached data first
export const filterUserCreatedListings = (listings: NostrListing[]): NostrListing[] => {
  const history = getUserHistory();
  
  // Try to get created listings from cache first
  try {
    const createdListingsObjsJson = localStorage.getItem('restr_created_listings_data');
    if (createdListingsObjsJson) {
      const createdListingsObjs: Record<string, NostrListing> = JSON.parse(createdListingsObjsJson);
      
      // If we have cached data, use it instead of filtering from network data
      const cachedListings = history.createdListings
        .map(id => createdListingsObjs[id])
        .filter(listing => !!listing);
      
      if (cachedListings.length > 0) {
        console.log(`Retrieved ${cachedListings.length} created listings from cache`);
        return cachedListings;
      }
    }
  } catch (error) {
    console.error('Error retrieving cached created listings:', error);
  }
  
  // Fall back to filtering from provided listings if cache fails
  console.log('Falling back to network data for created listings');
  return listings.filter(listing => history.createdListings.includes(listing.id));
};

// Add these new state variables at the top level
const localStorageNoticeState = {
  savedListingsNoticeVisible: false,
  createdListingsNoticeVisible: false,
  setSavedListingsNoticeVisible: (visible: boolean) => {},
  setCreatedListingsNoticeVisible: (visible: boolean) => {}
};

export const setLocalStorageNoticeHandlers = (
  setSavedVisible: (visible: boolean) => void,
  setCreatedVisible: (visible: boolean) => void
) => {
  localStorageNoticeState.setSavedListingsNoticeVisible = setSavedVisible;
  localStorageNoticeState.setCreatedListingsNoticeVisible = setCreatedVisible;
};
