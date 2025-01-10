import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq, or } from "drizzle-orm";
import { db } from "@db";
import { politicians, relationships, relationshipTypes, affiliations } from "@db/schema";

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

  app.put("/api/politicians/:id", async (req, res) => {
    try {
      const [updatedPolitician] = await db
        .update(politicians)
        .set(req.body)
        .where(eq(politicians.id, parseInt(req.params.id)))
        .returning();
      res.json(updatedPolitician);
    } catch (error) {
      res.status(500).json({ error: "Failed to update politician" });
    }
  });

  app.delete("/api/politicians/:id", async (req, res) => {
    try {
      // First delete all relationships involving this politician
      await db.delete(relationships).where(
        or(
          eq(relationships.sourcePoliticianId, parseInt(req.params.id)),
          eq(relationships.targetPoliticianId, parseInt(req.params.id))
        )
      );

      // Then delete the politician
      await db.delete(politicians).where(eq(politicians.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete politician" });
    }
  });

  // Affiliations
  app.get("/api/affiliations", async (_req, res) => {
    try {
      const all = await db.select().from(affiliations);
      res.json(all);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch affiliations" });
    }
  });

  app.post("/api/affiliations", async (req, res) => {
    try {
      const affiliation = await db.insert(affiliations).values(req.body).returning();
      res.json(affiliation[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create affiliation" });
    }
  });

  app.put("/api/affiliations/:id", async (req, res) => {
    try {
      const [updated] = await db
        .update(affiliations)
        .set(req.body)
        .where(eq(affiliations.id, parseInt(req.params.id)))
        .returning();
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update affiliation" });
    }
  });

  app.delete("/api/affiliations/:id", async (req, res) => {
    try {
      await db.delete(affiliations).where(eq(affiliations.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete affiliation" });
    }
  });

  // Relationship Types
  app.get("/api/relationship-types", async (_req, res) => {
    try {
      const types = await db.select().from(relationshipTypes);
      res.json(types);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch relationship types" });
    }
  });

  app.post("/api/relationship-types", async (req, res) => {
    try {
      const type = await db.insert(relationshipTypes).values(req.body).returning();
      res.json(type[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create relationship type" });
    }
  });

  app.delete("/api/relationship-types/:id", async (req, res) => {
    try {
      await db.delete(relationshipTypes).where(eq(relationshipTypes.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete relationship type" });
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

  app.delete("/api/relationships/:id", async (req, res) => {
    try {
      await db.delete(relationships).where(eq(relationships.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete relationship" });
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