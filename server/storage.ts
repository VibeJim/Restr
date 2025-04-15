import { 
  users, type User, type InsertUser,
  listings, type Listing, type InsertListing,
  reviews, type Review, type InsertReview,
  bookings, type Booking, type InsertBooking
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByPubkey(pubkey: string): Promise<User | undefined>;
  getUserByNpub(npub: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;

  // Listing operations
  getListing(id: number): Promise<Listing | undefined>;
  getListings(options?: { limit?: number, offset?: number, filter?: Partial<Listing> }): Promise<Listing[]>;
  getListingsByHost(hostId: string): Promise<Listing[]>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: number, listing: Partial<Listing>): Promise<Listing | undefined>;
  deleteListing(id: number): Promise<boolean>;

  // Review operations
  getReview(id: number): Promise<Review | undefined>;
  getReviewsByListing(listingId: number): Promise<Review[]>;
  getReviewsByAuthor(authorId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, review: Partial<Review>): Promise<Review | undefined>;
  deleteReview(id: number): Promise<boolean>;

  // Booking operations
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByListing(listingId: number): Promise<Booking[]>;
  getBookingsByUser(userId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<Booking>): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private listings: Map<number, Listing>;
  private reviews: Map<number, Review>;
  private bookings: Map<number, Booking>;
  private currentUserId: number;
  private currentListingId: number;
  private currentReviewId: number;
  private currentBookingId: number;

  constructor() {
    this.users = new Map();
    this.listings = new Map();
    this.reviews = new Map();
    this.bookings = new Map();
    this.currentUserId = 1;
    this.currentListingId = 1;
    this.currentReviewId = 1;
    this.currentBookingId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByPubkey(pubkey: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.pubkey === pubkey);
  }

  async getUserByNpub(npub: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.npub === npub);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { ...insertUser, id, lastSeen: now };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userData, lastSeen: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Listing operations
  async getListing(id: number): Promise<Listing | undefined> {
    return this.listings.get(id);
  }

  async getListings(options: { limit?: number, offset?: number, filter?: Partial<Listing> } = {}): Promise<Listing[]> {
    let listings = Array.from(this.listings.values());
    
    // Apply filters if provided
    if (options.filter) {
      const filter = options.filter;
      listings = listings.filter(listing => {
        return Object.entries(filter).every(([key, value]) => {
          if (value === undefined) return true;
          return listing[key as keyof Listing] === value;
        });
      });
    }
    
    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || listings.length;
    
    return listings.slice(offset, offset + limit);
  }

  async getListingsByHost(hostId: string): Promise<Listing[]> {
    return Array.from(this.listings.values()).filter(listing => listing.hostId === hostId);
  }

  async createListing(insertListing: InsertListing): Promise<Listing> {
    const id = this.currentListingId++;
    const now = new Date();
    const listing: Listing = { ...insertListing, id, createdAt: now };
    this.listings.set(id, listing);
    return listing;
  }

  async updateListing(id: number, listingData: Partial<Listing>): Promise<Listing | undefined> {
    const listing = this.listings.get(id);
    if (!listing) return undefined;

    const updatedListing = { ...listing, ...listingData };
    this.listings.set(id, updatedListing);
    return updatedListing;
  }

  async deleteListing(id: number): Promise<boolean> {
    return this.listings.delete(id);
  }

  // Review operations
  async getReview(id: number): Promise<Review | undefined> {
    return this.reviews.get(id);
  }

  async getReviewsByListing(listingId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(review => review.listingId === listingId);
  }

  async getReviewsByAuthor(authorId: string): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(review => review.authorId === authorId);
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = this.currentReviewId++;
    const now = new Date();
    const review: Review = { ...insertReview, id, createdAt: now };
    this.reviews.set(id, review);
    return review;
  }

  async updateReview(id: number, reviewData: Partial<Review>): Promise<Review | undefined> {
    const review = this.reviews.get(id);
    if (!review) return undefined;

    const updatedReview = { ...review, ...reviewData };
    this.reviews.set(id, updatedReview);
    return updatedReview;
  }

  async deleteReview(id: number): Promise<boolean> {
    return this.reviews.delete(id);
  }

  // Booking operations
  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByListing(listingId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => booking.listingId === listingId);
  }

  async getBookingsByUser(userId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => booking.userId === userId);
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = this.currentBookingId++;
    const now = new Date();
    const booking: Booking = { ...insertBooking, id, createdAt: now };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBooking(id: number, bookingData: Partial<Booking>): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;

    const updatedBooking = { ...booking, ...bookingData };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async deleteBooking(id: number): Promise<boolean> {
    return this.bookings.delete(id);
  }
}

export const storage = new MemStorage();
