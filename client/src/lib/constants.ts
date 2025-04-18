export const RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nostr-pub.wellorder.net',
  'wss://relay.current.fyi',
  'wss://nos.lol',
  'wss://relay.snort.social'
];

export const DEFAULT_PROFILE_IMAGE = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

// Nostr Kind Numbers
export const NOSTR_KINDS = {
  METADATA: 0,
  TEXT_NOTE: 1,
  COMMENT: 1, // NIP-22 comment event (same as TEXT_NOTE but with e tag)
  LISTING: 30001, // Custom kind for listings
  REVIEW: 30002,  // Custom kind for reviews
  BOOKING: 30003,  // Custom kind for bookings
  CALENDAR_EVENT: 31922, // NIP-52 calendar events
  ZAP_REQUEST: 9734,
  ZAP_RECEIPT: 9735 // NIP-57 zap receipt
};

export const CATEGORY_ICONS = {
  "All homes": "ri-home-4-line",
  "Apartments": "ri-hotel-line",
  "Mountain": "ri-landscape-line",
  "Beachfront": "ri-tsunami-line",
  "Amazing views": "ri-rainbow-line",
  "Countryside": "ri-leaf-line",
  "Tiny homes": "ri-community-line",
  "Design": "ri-building-4-line",
  "Lakefront": "ri-water-flash-line"
};

export const AMENITIES = [
  { name: "Wifi", icon: "ri-wifi-line" },
  { name: "TV", icon: "ri-tv-line" },
  { name: "Kitchen", icon: "ri-fridge-line" },
  { name: "Free parking", icon: "ri-parking-box-line" },
  { name: "Air conditioning", icon: "ri-air-conditioning-line" },
  { name: "Self check-in", icon: "ri-24-hours-line" },
  { name: "Washer", icon: "ri-washing-machine-line" },
  { name: "Dryer", icon: "ri-temp-cold-line" },
  { name: "Heating", icon: "ri-fire-line" },
  { name: "Pool", icon: "ri-water-flash-line" },
  { name: "Hot tub", icon: "ri-bubble-chart-line" },
  { name: "Gym", icon: "ri-boxing-line" },
  { name: "Pets allowed", icon: "ri-footprint-line" },
  { name: "Smoking allowed", icon: "ri-smoking-line" },
  { name: "Breakfast", icon: "ri-restaurant-line" }
];

export const SAMPLE_LISTINGS = [
  {
    title: "Modern apartment in downtown",
    location: "New York, NY",
    price: 120,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "Luxury Villa with Ocean View",
    location: "Miami, FL",
    price: 350,
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80"
  }
];
