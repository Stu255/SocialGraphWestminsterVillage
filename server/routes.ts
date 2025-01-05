import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { politicians, relationships } from "@db/schema";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Politicians
  app.get("/api/politicians", async (_req, res) => {
    try {
      const allPoliticians = await db.select().from(politicians);
      res.json(allPoliticians);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch politicians" });
    }
  });

  app.post("/api/politicians", async (req, res) => {
    try {
      const politician = await db.insert(politicians).values(req.body).returning();
      res.json(politician[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create politician" });
    }
  });

  // Relationships
  app.get("/api/relationships", async (_req, res) => {
    try {
      const allRelationships = await db.select().from(relationships);
      res.json(allRelationships);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch relationships" });
    }
  });

  app.post("/api/relationships", async (req, res) => {
    try {
      const relationship = await db.insert(relationships).values(req.body).returning();
      res.json(relationship[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create relationship" });
    }
  });

  // Network Analysis Endpoints
  app.get("/api/analysis/centrality", async (_req, res) => {
    try {
      const [allRelationships, allPoliticians] = await Promise.all([
        db.select().from(relationships),
        db.select().from(politicians)
      ]);

      const centrality = allPoliticians.map(p => {
        const degree = allRelationships.filter(r =>
          r.sourcePoliticianId === p.id || r.targetPoliticianId === p.id
        ).length;
        return { id: p.id, name: p.name, centrality: degree };
      });

      res.json(centrality);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate centrality" });
    }
  });

  return httpServer;
}