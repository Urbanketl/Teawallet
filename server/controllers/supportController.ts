import { Request, Response } from "express";
import { storage } from "../storage";
import { insertSupportTicketSchema, insertSupportMessageSchema } from "@shared/schema";

export async function getUserSupportTickets(req: any, res: Response) {
  try {
    // Prioritize Replit auth over demo session
    const userId = req.user?.claims?.sub || req.session?.user?.id;
    const tickets = await storage.getUserSupportTickets(userId);
    res.json(tickets);
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    res.status(500).json({ message: "Failed to fetch support tickets" });
  }
}

export async function createSupportTicket(req: any, res: Response) {
  try {
    // Prioritize Replit auth over demo session
    const userId = req.user?.claims?.sub || req.session?.user?.id;
    console.log("Creating support ticket for userId:", userId);
    console.log("Request body:", req.body);
    console.log("Full request user info:", { 
      userClaims: req.user?.claims, 
      session: req.session?.user,
      finalUserId: userId 
    });
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    const validated = insertSupportTicketSchema.parse({
      ...req.body,
      userId,
    });

    const ticket = await storage.createSupportTicket(validated);
    console.log("Ticket created successfully:", ticket);
    res.status(201).json(ticket);
  } catch (error) {
    console.error("Error creating support ticket:", error);
    console.error("Error details:", error);
    res.status(500).json({ message: "Failed to create support ticket" });
  }
}

export async function getSupportTicketById(req: any, res: Response) {
  try {
    const { ticketId } = req.params;
    const userId = req.session?.user?.id || req.user?.claims?.sub;
    
    const ticket = await storage.getSupportTicket(Number(ticketId));
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Check if user owns the ticket or is admin
    const user = await storage.getUser(userId);
    if (ticket.userId !== userId && !user?.isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await storage.getSupportMessages(Number(ticketId));
    const statusHistory = await storage.getTicketStatusHistory(Number(ticketId));

    res.json({
      ticket,
      messages,
      statusHistory,
    });
  } catch (error) {
    console.error("Error fetching support ticket:", error);
    res.status(500).json({ message: "Failed to fetch support ticket" });
  }
}

export async function createSupportMessage(req: any, res: Response) {
  try {
    const { ticketId } = req.params;
    const userId = req.session?.user?.id || req.user?.claims?.sub;
    
    const validated = insertSupportMessageSchema.parse({
      ...req.body,
      ticketId: Number(ticketId),
      senderId: userId,
    });

    const message = await storage.createSupportMessage(validated);
    res.status(201).json(message);
  } catch (error) {
    console.error("Error creating support message:", error);
    res.status(500).json({ message: "Failed to create support message" });
  }
}

export async function getFaqArticles(req: Request, res: Response) {
  try {
    const { category } = req.query;
    const articles = await storage.getFaqArticles(category as string);
    res.json(articles);
  } catch (error) {
    console.error("Error fetching FAQ articles:", error);
    res.status(500).json({ message: "Failed to fetch FAQ articles" });
  }
}

export async function incrementFaqViews(req: Request, res: Response) {
  try {
    const { articleId } = req.params;
    await storage.incrementFaqViews(Number(articleId));
    res.json({ message: "View count updated" });
  } catch (error) {
    console.error("Error updating FAQ views:", error);
    res.status(500).json({ message: "Failed to update view count" });
  }
}