import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq, or, desc, and } from "drizzle-orm";
import { db } from "@db";
import { 
  people, 
  relationships, 
  relationshipTypes, 
  affiliations, 
  socialGraphs,
  fieldPreferences,
  insertPersonSchema,
  insertSocialGraphSchema,
  customFields 
} from "@db/schema";
import { setupAuth } from "./auth";

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

function calculateCloseness(
  nodeId: number,
  nodes: Map<number, Set<number>>,
  totalNodes: number
): number {
  const distances = new Map<number, number>();
  const queue: [number, number][] = [[nodeId, 0]];
  distances.set(nodeId, 0);

  while (queue.length > 0) {
    const [currentNode, distance] = queue.shift()!;
    const neighbors = nodes.get(currentNode) || new Set();

    for (const neighbor of neighbors) {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, distance + 1);
        queue.push([neighbor, distance + 1]);
      }
    }
  }

  const totalDistance = Array.from(distances.values()).reduce((sum, dist) => sum + dist, 0);
  const reachableNodes = distances.size;

  if (reachableNodes === 1) return 0;
  if (reachableNodes < totalNodes) {
    return ((reachableNodes - 1) * (reachableNodes - 1)) / 
           ((totalNodes - 1) * totalDistance);
  }

  return (reachableNodes - 1) / totalDistance;
}

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  const httpServer = createServer(app);

  // Social Graphs
  app.get("/api/graphs", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      const graphs = await db
        .select()
        .from(socialGraphs)
        .where(eq(socialGraphs.userId, req.user.id));
      res.json(graphs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch graphs" });
    }
  });

  app.post("/api/graphs", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      const result = insertSocialGraphSchema.safeParse({
        ...req.body,
        userId: req.user.id
      });

      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid input: " + result.error.issues.map(i => i.message).join(", ") 
        });
      }

      const [graph] = await db
        .insert(socialGraphs)
        .values(result.data)
        .returning();
      res.json(graph);
    } catch (error) {
      res.status(500).json({ error: "Failed to create graph" });
    }
  });

  // People
  app.get("/api/people", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    const { graphId } = req.query;
    if (!graphId) {
      return res.status(400).json({ error: "Graph ID is required" });
    }

    try {
      const allPeople = await db
        .select()
        .from(people)
        .where(eq(people.graphId, Number(graphId)));
      const sortedPeople = sortPeopleByName(allPeople);
      res.json(sortedPeople);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  app.post("/api/people", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      const result = insertPersonSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid input: " + result.error.issues.map(i => i.message).join(", ") 
        });
      }

      const person = await db.insert(people).values(result.data).returning();
      res.json(person[0]);
    } catch (error: any) {
      console.error("Error creating person:", error);
      res.status(500).json({ error: error?.message || "Failed to create person" });
    }
  });

  app.put("/api/people/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      const [updatedPerson] = await db
        .update(people)
        .set(req.body)
        .where(and(eq(people.id, parseInt(req.params.id)), eq(people.graphId, req.body.graphId)))
        .returning();
      res.json(updatedPerson);
    } catch (error) {
      res.status(500).json({ error: "Failed to update person" });
    }
  });

  app.delete("/api/people/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
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
  app.get("/api/affiliations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    const { graphId } = req.query;
    if (!graphId) {
      return res.status(400).json({ error: "Graph ID is required" });
    }
    try {
      // First get all affiliations
      const allAffiliations = await db.select().from(affiliations).where(eq(affiliations.graphId, Number(graphId)));

      // Then get the count of people for each affiliation
      const affiliationsWithCounts = await Promise.all(
        allAffiliations.map(async (affiliation) => {
          const count = await db
            .select()
            .from(people)
            .where(and(eq(people.affiliation, affiliation.name), eq(people.graphId, Number(graphId))));

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
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      const affiliation = await db.insert(affiliations).values({...req.body, graphId: req.body.graphId}).returning();
      res.json(affiliation[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create affiliation" });
    }
  });

  app.put("/api/affiliations/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      const [updated] = await db
        .update(affiliations)
        .set({...req.body, graphId: req.body.graphId})
        .where(and(eq(affiliations.id, parseInt(req.params.id)), eq(affiliations.graphId, req.body.graphId)))
        .returning();
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update affiliation" });
    }
  });

  app.delete("/api/affiliations/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      await db.delete(affiliations).where(eq(affiliations.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete affiliation" });
    }
  });

  // Relationship Types
  app.get("/api/relationship-types", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    const { graphId } = req.query;
    if (!graphId) {
      return res.status(400).json({ error: "Graph ID is required" });
    }
    try {
      const types = await db.select().from(relationshipTypes).where(eq(relationshipTypes.graphId, Number(graphId)));
      res.json(types);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch relationship types" });
    }
  });

  app.post("/api/relationship-types", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      const type = await db.insert(relationshipTypes).values({...req.body, graphId: req.body.graphId}).returning();
      res.json(type[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create relationship type" });
    }
  });

  app.delete("/api/relationship-types/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      await db.delete(relationshipTypes).where(eq(relationshipTypes.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete relationship type" });
    }
  });

  // Relationships
  app.get("/api/relationships", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    const { graphId } = req.query;
    if (!graphId) {
      return res.status(400).json({ error: "Graph ID is required" });
    }
    try {
      const allRelationships = await db.select().from(relationships).where(eq(relationships.graphId, Number(graphId)));
      res.json(allRelationships);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch relationships" });
    }
  });

  app.post("/api/relationships", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      const relationship = await db.insert(relationships).values({...req.body, graphId: req.body.graphId}).returning();
      res.json(relationship[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create relationship" });
    }
  });

  app.delete("/api/relationships/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      await db.delete(relationships).where(eq(relationships.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete relationship" });
    }
  });

  // Network Analysis Endpoints
  app.get("/api/analysis/centrality", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    const { graphId } = req.query;
    if (!graphId) {
      return res.status(400).json({ error: "Graph ID is required" });
    }
    try {
      const [allRelationships, allPeople] = await Promise.all([
        db.select().from(relationships).where(eq(relationships.graphId, Number(graphId))),
        db.select().from(people).where(eq(people.graphId, Number(graphId)))
      ]);

      // Create adjacency list representation
      const nodes = new Map<number, Set<number>>();
      allPeople.forEach(p => nodes.set(p.id, new Set()));

      allRelationships.forEach(r => {
        const sourceSet = nodes.get(r.sourcePersonId) || new Set();
        const targetSet = nodes.get(r.targetPersonId) || new Set();
        sourceSet.add(r.targetPersonId);
        targetSet.add(r.sourcePersonId);
        nodes.set(r.sourcePersonId, sourceSet);
        nodes.set(r.targetPersonId, targetSet);
      });

      const totalNodes = allPeople.length;
      const centrality = allPeople.map(p => ({
        id: p.id,
        name: p.name,
        centrality: calculateCloseness(p.id, nodes, totalNodes)
      }));

      res.json(centrality);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate centrality" });
    }
  });

  // Custom Fields
  app.get("/api/custom-fields", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    const { graphId } = req.query;
    if (!graphId) {
      return res.status(400).json({ error: "Graph ID is required" });
    }
    try {
      const fields = await db.select().from(customFields).where(eq(customFields.graphId, Number(graphId)));
      res.json(fields);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom fields" });
    }
  });

  app.post("/api/custom-fields", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      const { graphId, fieldName, fieldType, isRequired } = req.body;

      if (!graphId) {
        return res.status(400).json({ error: "Graph ID is required" });
      }

      const field = await db
        .insert(customFields)
        .values({
          graphId: Number(graphId),
          fieldName,
          fieldType,
          isRequired: Boolean(isRequired)
        })
        .returning();

      res.json(field[0]);
    } catch (error) {
      console.error("Error creating custom field:", error);
      res.status(500).json({ error: "Failed to create custom field" });
    }
  });

  app.delete("/api/custom-fields/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      await db.delete(customFields).where(eq(customFields.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete custom field" });
    }
  });

  // Field Preferences
  app.get("/api/field-preferences/:graphId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      const [prefs] = await db
        .select()
        .from(fieldPreferences)
        .where(eq(fieldPreferences.graphId, parseInt(req.params.graphId)));

      if (!prefs) {
        // Return default preferences if none exist
        const defaultPrefs = {
          order: [
            "name", "jobTitle", "organization", "lastContact",
            "officeNumber", "mobileNumber", "email1", "email2",
            "linkedin", "twitter", "notes"
          ],
          hidden: []
        };

        const [newPrefs] = await db
          .insert(fieldPreferences)
          .values({
            graphId: parseInt(req.params.graphId),
            preferences: defaultPrefs
          })
          .returning();

        return res.json(newPrefs.preferences);
      }

      res.json(prefs.preferences);
    } catch (error) {
      console.error("Error fetching field preferences:", error);
      res.status(500).json({ error: "Failed to fetch field preferences" });
    }
  });

  app.put("/api/field-preferences/:graphId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      const [prefs] = await db
        .update(fieldPreferences)
        .set({ preferences: req.body })
        .where(eq(fieldPreferences.graphId, parseInt(req.params.graphId)))
        .returning();

      if (!prefs) {
        const [newPrefs] = await db
          .insert(fieldPreferences)
          .values({
            graphId: parseInt(req.params.graphId),
            preferences: req.body
          })
          .returning();

        return res.json(newPrefs.preferences);
      }

      res.json(prefs.preferences);
    } catch (error) {
      console.error("Error updating field preferences:", error);
      res.status(500).json({ error: "Failed to update field preferences" });
    }
  });

  return httpServer;
}