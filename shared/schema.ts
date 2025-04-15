import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model for storing NOSTR identities
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  npub: text("npub").notNull().unique(),
  pubkey: text("pubkey").notNull().unique(),
  name: text("name"),
  about: text("about"),
  picture: text("picture"),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

// Listings model
export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  price: integer("price").notNull(),
  currency: text("currency").default("USD"),
  images: text("images").array().notNull(),
  beds: integer("beds").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  maxGuests: integer("max_guests").notNull(),
  amenities: text("amenities").array(),
  hostId: text("host_id").notNull(), // NOSTR pubkey
  eventId: text("event_id"), // NOSTR event ID
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  createdAt: true,
});

// Reviews model
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  rating: integer("rating").notNull(),
  content: text("content").notNull(),
  authorId: text("author_id").notNull(), // NOSTR pubkey
  listingId: integer("listing_id").notNull(),
  eventId: text("event_id"), // NOSTR event ID
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

// Bookings model
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull(),
  userId: text("user_id").notNull(), // NOSTR pubkey
  checkIn: timestamp("check_in").notNull(),
  checkOut: timestamp("check_out").notNull(),
  guests: integer("guests").notNull(),
  status: text("status").notNull().default("pending"), // pending, confirmed, cancelled, completed
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, refunded
  totalPrice: integer("total_price").notNull(),
  paymentDetails: jsonb("payment_details"),
  eventId: text("event_id"), // NOSTR event ID
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

// Define type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
