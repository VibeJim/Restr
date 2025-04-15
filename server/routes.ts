import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertListingSchema, insertReviewSchema, insertBookingSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  });

  app.get("/api/users/npub/:npub", async (req: Request, res: Response) => {
    const npub = req.params.npub;
    const user = await storage.getUserByNpub(npub);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  });

  app.get("/api/users/pubkey/:pubkey", async (req: Request, res: Response) => {
    const pubkey = req.params.pubkey;
    const user = await storage.getUserByPubkey(pubkey);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  });

  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUserByNpub = await storage.getUserByNpub(userData.npub);
      const existingUserByPubkey = await storage.getUserByPubkey(userData.pubkey);

      if (existingUserByNpub || existingUserByPubkey) {
        return res.status(409).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Listing routes
  app.get("/api/listings", async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
    
    const listings = await storage.getListings({ limit, offset });
    res.json(listings);
  });

  app.get("/api/listings/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid listing ID" });
    }

    const listing = await storage.getListing(id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.json(listing);
  });

  app.get("/api/listings/host/:hostId", async (req: Request, res: Response) => {
    const hostId = req.params.hostId;
    const listings = await storage.getListingsByHost(hostId);
    res.json(listings);
  });

  app.post("/api/listings", async (req: Request, res: Response) => {
    try {
      const listingData = insertListingSchema.parse(req.body);
      const listing = await storage.createListing(listingData);
      res.status(201).json(listing);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid listing data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create listing" });
    }
  });

  // Review routes
  app.get("/api/reviews/listing/:listingId", async (req: Request, res: Response) => {
    const listingId = parseInt(req.params.listingId);
    if (isNaN(listingId)) {
      return res.status(400).json({ message: "Invalid listing ID" });
    }

    const reviews = await storage.getReviewsByListing(listingId);
    res.json(reviews);
  });

  app.post("/api/reviews", async (req: Request, res: Response) => {
    try {
      const reviewData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Booking routes
  app.get("/api/bookings/user/:userId", async (req: Request, res: Response) => {
    const userId = req.params.userId;
    const bookings = await storage.getBookingsByUser(userId);
    res.json(bookings);
  });

  app.get("/api/bookings/listing/:listingId", async (req: Request, res: Response) => {
    const listingId = parseInt(req.params.listingId);
    if (isNaN(listingId)) {
      return res.status(400).json({ message: "Invalid listing ID" });
    }

    const bookings = await storage.getBookingsByListing(listingId);
    res.json(bookings);
  });

  app.post("/api/bookings", async (req: Request, res: Response) => {
    try {
      const bookingData = insertBookingSchema.parse(req.body);
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
