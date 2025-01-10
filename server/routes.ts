import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq, or } from "drizzle-orm";
import { db } from "@db";
import { people, relationships, relationshipTypes, affiliations } from "@db/schema";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // People
  app.get("/api/people", async (_req, res) => {
    try {
      const allPeople = await db.select().from(people);
      res.json(allPeople);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  app.post("/api/people", async (req, res) => {
    try {
      const person = await db.insert(people).values(req.body).returning();
      res.json(person[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create person" });
    }
  });

  app.put("/api/people/:id", async (req, res) => {
    try {
      const [updatedPerson] = await db
        .update(people)
        .set(req.body)
        .where(eq(people.id, parseInt(req.params.id)))
        .returning();
      res.json(updatedPerson);
    } catch (error) {
      res.status(500).json({ error: "Failed to update person" });
    }
  });

  app.delete("/api/people/:id", async (req, res) => {
    try {
      // First delete all relationships involving this person
      await db.delete(relationships).where(
        or(
          eq(relationships.sourcePersonId, parseInt(req.params.id)),
          eq(relationships.targetPersonId, parseInt(req.params.id))
        )
      );

      // Then delete the person
      await db.delete(people).where(eq(people.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete person" });
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
      const [allRelationships, allPeople] = await Promise.all([
        db.select().from(relationships),
        db.select().from(people)
      ]);

      const centrality = allPeople.map(p => {
        const degree = allRelationships.filter(r =>
          r.sourcePersonId === p.id || r.targetPersonId === p.id
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