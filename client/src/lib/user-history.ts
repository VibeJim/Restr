import { NostrListing } from '@/types/nostr';

// Storage keys
const USER_CREATED_LISTINGS_KEY = 'restr_user_created_listings';
const USER_VIEWED_LISTINGS_KEY = 'restr_user_viewed_listings';

interface UserListingHistory {
  createdListings: string[]; // IDs of listings created by the user
  viewedListings: string[]; // IDs of listings viewed by the user
}

/**
 * Save a listing as created by the current user
 */
export const saveCreatedListing = (listing: NostrListing): void => {
  try {
    // Get current created listings
    const history = getUserHistory();
    
    // Add the listing ID if it doesn't exist
    if (!history.createdListings.includes(listing.id)) {
      history.createdListings.push(listing.id);
      
      // Save updated history
      localStorage.setItem(USER_CREATED_LISTINGS_KEY, JSON.stringify(history.createdListings));
    }
  } catch (error) {
    console.error('Error saving created listing to history:', error);
  }
};

/**
 * Save a listing as viewed by the current user
 */
export const saveViewedListing = (listing: NostrListing): void => {
  try {
    // Get current viewed listings
    const history = getUserHistory();
    
    // Add the listing ID if it doesn't exist
    if (!history.viewedListings.includes(listing.id)) {
      // Add to the beginning for most recent first
      history.viewedListings.unshift(listing.id);
      
      // Limit to 20 most recent views
      if (history.viewedListings.length > 20) {
        history.viewedListings = history.viewedListings.slice(0, 20);
      }
      
      // Save updated history
      localStorage.setItem(USER_VIEWED_LISTINGS_KEY, JSON.stringify(history.viewedListings));
    }
  } catch (error) {
    console.error('Error saving viewed listing to history:', error);
  }
};

/**
 * Get the user's listing history
 */
export const getUserHistory = (): UserListingHistory => {
  try {
    // Get created listings from storage
    const createdListingsJson = localStorage.getItem(USER_CREATED_LISTINGS_KEY);
    const createdListings = createdListingsJson ? JSON.parse(createdListingsJson) : [];
    
    // Get viewed listings from storage
    const viewedListingsJson = localStorage.getItem(USER_VIEWED_LISTINGS_KEY);
    const viewedListings = viewedListingsJson ? JSON.parse(viewedListingsJson) : [];
    
    return { createdListings, viewedListings };
  } catch (error) {
    console.error('Error getting user history:', error);
    return { createdListings: [], viewedListings: [] };
  }
};

/**
 * Filter a list of listings to show only those created by the user
 */
export const filterUserCreatedListings = (listings: NostrListing[]): NostrListing[] => {
  const history = getUserHistory();
  return listings.filter(listing => history.createdListings.includes(listing.id));
};

/**
 * Filter a list of listings to show only those viewed by the user
 */
export const filterUserViewedListings = (listings: NostrListing[]): NostrListing[] => {
  const history = getUserHistory();
  
  // Build a map of listings by ID for quick lookup
  const listingMap = new Map<string, NostrListing>();
  listings.forEach(listing => listingMap.set(listing.id, listing));
  
  // Return listings in the order they were viewed (most recent first)
  return history.viewedListings
    .map(id => listingMap.get(id))
    .filter((listing): listing is NostrListing => !!listing);
};