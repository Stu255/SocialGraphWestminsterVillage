import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq, or, desc } from "drizzle-orm";
import { db } from "@db";
import { people, relationships, relationshipTypes, affiliations, insertPersonSchema } from "@db/schema";

function getSortableSurname(name: string): string {
  const parts = name.split(" ");
  if (parts.length === 3 && (parts[0] === "Sir" || parts[0] === "Dame")) {
    return parts[2].toLowerCase();
  }
  return (parts[1] || parts[0]).toLowerCase();
}

function sortPeopleByName(peopleList: any[]): any[] {
  return [...peopleList].sort((a, b) => {
    const surnameA = getSortableSurname(a.name);
    const surnameB = getSortableSurname(b.name);
    return surnameA.localeCompare(surnameB);
  });
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // People
  app.get("/api/people", async (_req, res) => {
    try {
      const allPeople = await db.select().from(people);
      // Sort people by surname before sending response
      const sortedPeople = sortPeopleByName(allPeople);
      res.json(sortedPeople);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  app.post("/api/people", async (req, res) => {
    try {
      // Validate request body
      const result = insertPersonSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid input: " + result.error.issues.map(i => i.message).join(", ") 
        });
      }

      // Check if affiliation exists
      const [affiliation] = await db
        .select()
        .from(affiliations)
        .where(eq(affiliations.name, result.data.affiliation))
        .limit(1);

      if (!affiliation) {
        return res.status(400).json({ error: "Invalid affiliation" });
      }

      const person = await db.insert(people).values(result.data).returning();
      res.json(person[0]);
    } catch (error: any) {
      console.error("Error creating person:", error);
      res.status(500).json({ error: error?.message || "Failed to create person" });
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
      // First get all affiliations
      const allAffiliations = await db.select().from(affiliations);

      // Then get the count of people for each affiliation
      const affiliationsWithCounts = await Promise.all(
        allAffiliations.map(async (affiliation) => {
          const count = await db
            .select()
            .from(people)
            .where(eq(people.affiliation, affiliation.name));

          return {
            ...affiliation,
            memberCount: count.length
          };
        })
      );

      // Sort by member count in descending order
      const sortedAffiliations = affiliationsWithCounts.sort((a, b) => 
        b.memberCount - a.memberCount
      );

      res.json(sortedAffiliations);
    } catch (error) {
      console.error("Error fetching affiliations:", error);
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