import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq, and } from "drizzle-orm";
import { db } from "@db";
import { politicians, committees, relationships, committeeMemberships, historicalPositions } from "@db/schema";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Politicians
  app.get("/api/politicians", async (_req, res) => {
    const allPoliticians = await db.query.politicians.findMany({
      with: {
        committeeMemberships: true,
        historicalPositions: true,
      },
    });
    res.json(allPoliticians);
  });

  app.post("/api/politicians", async (req, res) => {
    const politician = await db.insert(politicians).values(req.body).returning();
    res.json(politician[0]);
  });

  app.put("/api/politicians/:id", async (req, res) => {
    const { id } = req.params;
    const politician = await db
      .update(politicians)
      .set(req.body)
      .where(eq(politicians.id, parseInt(id)))
      .returning();
    res.json(politician[0]);
  });

  // Relationships
  app.get("/api/relationships", async (_req, res) => {
    const allRelationships = await db.query.relationships.findMany({
      with: {
        sourceRelations: true,
        targetRelations: true,
      },
    });
    res.json(allRelationships);
  });

  app.post("/api/relationships", async (req, res) => {
    const relationship = await db.insert(relationships).values(req.body).returning();
    res.json(relationship[0]);
  });

  // Committees
  app.get("/api/committees", async (_req, res) => {
    const allCommittees = await db.query.committees.findMany({
      with: {
        memberships: true,
      },
    });
    res.json(allCommittees);
  });

  app.post("/api/committees", async (req, res) => {
    const committee = await db.insert(committees).values(req.body).returning();
    res.json(committee[0]);
  });

  // Committee Memberships
  app.post("/api/committee-memberships", async (req, res) => {
    const membership = await db.insert(committeeMemberships).values(req.body).returning();
    res.json(membership[0]);
  });

  // Historical Positions
  app.get("/api/historical-positions/:politicianId", async (req, res) => {
    const { politicianId } = req.params;
    const positions = await db.query.historicalPositions.findMany({
      where: eq(historicalPositions.politicianId, parseInt(politicianId)),
    });
    res.json(positions);
  });

  app.post("/api/historical-positions", async (req, res) => {
    const position = await db.insert(historicalPositions).values(req.body).returning();
    res.json(position[0]);
  });

  // Network Analysis Endpoints
  app.get("/api/analysis/centrality", async (_req, res) => {
    const relationships = await db.query.relationships.findMany();
    const politicians = await db.query.politicians.findMany();
    
    // Simple degree centrality calculation
    const centrality = politicians.map(p => {
      const degree = relationships.filter(r => 
        r.sourcePoliticianId === p.id || r.targetPoliticianId === p.id
      ).length;
      return { id: p.id, name: p.name, centrality: degree };
    });
    
    res.json(centrality);
  });

  return httpServer;
}
