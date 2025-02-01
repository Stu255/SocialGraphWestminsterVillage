import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq, or, desc, and } from "drizzle-orm";
import { db } from "@db";
import { 
  people, 
  relationships, 
  relationshipTypes, 
  organizations, 
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
  setupAuth(app);

  const httpServer = createServer(app);

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
      const graphData = {
        name: req.body.name,
        userId: req.user.id,
      };

      const result = insertSocialGraphSchema.safeParse(graphData);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid input: " + result.error.issues.map(i => i.message).join(", ") 
        });
      }

      const [graph] = await db.insert(socialGraphs).values(result.data).returning();
      res.json(graph);
    } catch (error: any) {
      console.error("Error creating graph:", error);
      res.status(500).json({ error: error?.message || "Failed to create graph" });
    }
  });

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
      console.log("Received person data:", req.body);

      const personData = {
        name: req.body.name,
        graphId: req.body.graphId,
        jobTitle: req.body.jobTitle,
        organization: req.body.organization,
        relationshipToYou: req.body.relationshipToYou,
        officeNumber: req.body.officeNumber,
        mobileNumber: req.body.mobileNumber,
        email1: req.body.email1,
        email2: req.body.email2,
        linkedin: req.body.linkedin,
        twitter: req.body.twitter,
        notes: req.body.notes,
      };

      console.log("Transformed person data:", personData);

      const result = insertPersonSchema.safeParse(personData);
      if (!result.success) {
        console.error("Validation failed:", result.error.issues);
        return res.status(400).json({ 
          error: "Invalid input: " + result.error.issues.map(i => i.message).join(", ") 
        });
      }

      const [person] = await db.insert(people).values(result.data).returning();
      res.json(person);
    } catch (error: any) {
      console.error("Error creating person:", error);
      res.status(500).json({ error: error?.message || "Failed to create person" });
    }
  });

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
      const { sourcePersonId, targetPersonId, relationshipType, graphId } = req.body;

      // Create bidirectional relationship in a single transaction
      const relationship = await db.transaction(async (tx) => {
        // First, delete any existing relationships between these nodes
        await tx.delete(relationships)
          .where(
            and(
              eq(relationships.graphId, graphId),
              or(
                and(
                  eq(relationships.sourcePersonId, sourcePersonId),
                  eq(relationships.targetPersonId, targetPersonId)
                ),
                and(
                  eq(relationships.sourcePersonId, targetPersonId),
                  eq(relationships.targetPersonId, sourcePersonId)
                )
              )
            )
          );

        // Then create the new bidirectional relationship
        const [forward] = await tx
          .insert(relationships)
          .values({ sourcePersonId, targetPersonId, relationshipType, graphId })
          .returning();

        const [reverse] = await tx
          .insert(relationships)
          .values({ 
            sourcePersonId: targetPersonId, 
            targetPersonId: sourcePersonId, 
            relationshipType, 
            graphId 
          })
          .returning();

        return forward;
      });

      res.json(relationship);
    } catch (error) {
      console.error("Error creating relationship:", error);
      res.status(500).json({ error: "Failed to create relationship" });
    }
  });

  app.delete("/api/relationships", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      const { sourcePersonId, targetPersonId, graphId } = req.query;
      if (!sourcePersonId || !targetPersonId || !graphId) {
        return res.status(400).json({ error: "Source ID, Target ID and Graph ID are required" });
      }

      // Delete both directions of the relationship in a single transaction
      await db.transaction(async (tx) => {
        await tx.delete(relationships)
          .where(and(
            eq(relationships.sourcePersonId, parseInt(sourcePersonId as string)),
            eq(relationships.targetPersonId, parseInt(targetPersonId as string)),
            eq(relationships.graphId, parseInt(graphId as string))
          ));

        await tx.delete(relationships)
          .where(and(
            eq(relationships.sourcePersonId, parseInt(targetPersonId as string)),
            eq(relationships.targetPersonId, parseInt(sourcePersonId as string)),
            eq(relationships.graphId, parseInt(graphId as string))
          ));
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting relationship:", error);
      res.status(500).json({ error: "Failed to delete relationship" });
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

  // Add organization routes
  app.get("/api/organizations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    const { graphId } = req.query;
    if (!graphId) {
      return res.status(400).json({ error: "Graph ID is required" });
    }

    try {
      const allOrganizations = await db
        .select()
        .from(organizations)
        .where(eq(organizations.graphId, Number(graphId)));
      res.json(allOrganizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });

  app.post("/api/organizations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      const [organization] = await db
        .insert(organizations)
        .values({
          name: req.body.name,
          graphId: req.body.graphId,
          industry: req.body.industry || null,
          hqCity: req.body.hqCity || null,
          brandColor: req.body.brandColor || "#000000",
          accentColor: req.body.accentColor || "#000000",
          website: req.body.website || null,
          headcount: req.body.headcount || null,
          turnover: req.body.turnover || null,
        })
        .returning();

      res.json(organization);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  });

  app.put("/api/organizations/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      const [organization] = await db
        .update(organizations)
        .set({
          name: req.body.name,
          industry: req.body.industry || null,
          hqCity: req.body.hqCity || null,
          brandColor: req.body.brandColor || "#000000",
          accentColor: req.body.accentColor || "#000000",
          website: req.body.website || null,
          headcount: req.body.headcount || null,
          turnover: req.body.turnover || null,
        })
        .where(eq(organizations.id, parseInt(req.params.id)))
        .returning();

      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      res.json(organization);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ error: "Failed to update organization" });
    }
  });

  // Add graph management routes
  app.put("/api/graphs/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      const [graph] = await db
        .update(socialGraphs)
        .set({ 
          name: req.body.name,
          modifiedAt: new Date()
        })
        .where(eq(socialGraphs.id, parseInt(req.params.id)))
        .returning();

      if (!graph) {
        return res.status(404).json({ error: "Graph not found" });
      }

      res.json(graph);
    } catch (error) {
      console.error("Error renaming graph:", error);
      res.status(500).json({ error: "Failed to rename graph" });
    }
  });

  app.post("/api/graphs/:id/duplicate", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      // Get the original graph
      const [originalGraph] = await db
        .select()
        .from(socialGraphs)
        .where(eq(socialGraphs.id, parseInt(req.params.id)));

      if (!originalGraph) {
        return res.status(404).json({ error: "Graph not found" });
      }

      // Update original graph's modified time
      await db
        .update(socialGraphs)
        .set({ modifiedAt: new Date() })
        .where(eq(socialGraphs.id, originalGraph.id));

      // Create new graph with copied name and current timestamp
      const [newGraph] = await db
        .insert(socialGraphs)
        .values({
          name: `${originalGraph.name} (Copy)`,
          userId: req.user.id,
          modifiedAt: new Date()
        })
        .returning();

      res.json(newGraph);
    } catch (error) {
      console.error("Error duplicating graph:", error);
      res.status(500).json({ error: "Failed to duplicate graph" });
    }
  });

  app.post("/api/graphs/:id/delete", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      const deleteAt = new Date();
      deleteAt.setHours(deleteAt.getHours() + 48);

      const [graph] = await db
        .update(socialGraphs)
        .set({ 
          deleteAt,
          modifiedAt: new Date()
        })
        .where(eq(socialGraphs.id, parseInt(req.params.id)))
        .returning();

      if (!graph) {
        return res.status(404).json({ error: "Graph not found" });
      }

      res.json(graph);
    } catch (error) {
      console.error("Error setting delete timer:", error);
      res.status(500).json({ error: "Failed to set delete timer" });
    }
  });

  app.delete("/api/graphs/:id/delete-timer", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      const [graph] = await db
        .update(socialGraphs)
        .set({ 
          deleteAt: null,
          modifiedAt: new Date()
        })
        .where(eq(socialGraphs.id, parseInt(req.params.id)))
        .returning();

      if (!graph) {
        return res.status(404).json({ error: "Graph not found" });
      }

      res.json(graph);
    } catch (error) {
      console.error("Error canceling delete timer:", error);
      res.status(500).json({ error: "Failed to cancel delete timer" });
    }
  });

  app.delete("/api/graphs/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      await db
        .delete(socialGraphs)
        .where(eq(socialGraphs.id, parseInt(req.params.id)));

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting graph:", error);
      res.status(500).json({ error: "Failed to delete graph" });
    }
  });

  return httpServer;
}