import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq, or, desc, and } from "drizzle-orm";
import { db } from "@db";
import { 
  people, 
  connections, 
  connectionTypes, 
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
      const now = new Date();
      const graphData = {
        name: req.body.name,
        userId: req.user.id,
        modifiedAt: now,
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
        userRelationshipType: req.body.relationshipToYou || 1,
        lastContact: req.body.lastContact,
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

  app.put("/api/people/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      console.log("Received update request for person:", req.params.id, req.body);

      // Validate relationship value if present
      if (req.body.relationshipToYou !== undefined && req.body.relationshipToYou !== null) {
        const relationshipValue = Number(req.body.relationshipToYou);
        if (isNaN(relationshipValue) || relationshipValue < 0 || relationshipValue > 5) {
          return res.status(400).json({ 
            error: "Invalid relationship value. Must be a number between 0 and 5" 
          });
        }
      }

      // Update the person
      const [updatedPerson] = await db
        .update(people)
        .set({
          name: req.body.name,
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
        })
        .where(eq(people.id, parseInt(req.params.id)))
        .returning();

      if (!updatedPerson) {
        return res.status(404).json({ error: "Person not found" });
      }

      console.log("Successfully updated person:", updatedPerson);
      res.json(updatedPerson);
    } catch (error: any) {
      console.error("Error updating person:", error);
      res.status(500).json({ 
        error: error?.message || "Failed to update person",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  app.get("/api/connections", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    const { graphId } = req.query;
    if (!graphId) {
      return res.status(400).json({ error: "Graph ID is required" });
    }
    try {
      const allConnections = await db.select().from(connections).where(eq(connections.graphId, Number(graphId)));
      res.json(allConnections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  });

  app.post("/api/connections", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      const { sourcePersonId, targetPersonId, connectionType, graphId } = req.body;

      // Create bidirectional connection in a single transaction
      const connection = await db.transaction(async (tx) => {
        // First, delete any existing connections between these nodes
        await tx.delete(connections)
          .where(
            and(
              eq(connections.graphId, graphId),
              or(
                and(
                  eq(connections.sourcePersonId, sourcePersonId),
                  eq(connections.targetPersonId, targetPersonId)
                ),
                and(
                  eq(connections.sourcePersonId, targetPersonId),
                  eq(connections.targetPersonId, sourcePersonId)
                )
              )
            )
          );

        // Then create the new bidirectional connection
        const [forward] = await tx
          .insert(connections)
          .values({ sourcePersonId, targetPersonId, connectionType, graphId })
          .returning();

        const [reverse] = await tx
          .insert(connections)
          .values({ 
            sourcePersonId: targetPersonId, 
            targetPersonId: sourcePersonId, 
            connectionType, 
            graphId 
          })
          .returning();

        return forward;
      });

      res.json(connection);
    } catch (error) {
      console.error("Error creating connection:", error);
      res.status(500).json({ error: "Failed to create connection" });
    }
  });

  app.delete("/api/connections", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      const { sourcePersonId, targetPersonId, graphId } = req.query;
      if (!sourcePersonId || !targetPersonId || !graphId) {
        return res.status(400).json({ error: "Source ID, Target ID and Graph ID are required" });
      }

      // Delete both directions of the connection in a single transaction
      await db.transaction(async (tx) => {
        await tx.delete(connections)
          .where(and(
            eq(connections.sourcePersonId, parseInt(sourcePersonId as string)),
            eq(connections.targetPersonId, parseInt(targetPersonId as string)),
            eq(connections.graphId, parseInt(graphId as string))
          ));

        await tx.delete(connections)
          .where(and(
            eq(connections.sourcePersonId, parseInt(targetPersonId as string)),
            eq(connections.targetPersonId, parseInt(sourcePersonId as string)),
            eq(connections.graphId, parseInt(graphId as string))
          ));
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting connection:", error);
      res.status(500).json({ error: "Failed to delete connection" });
    }
  });

  app.delete("/api/connections/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    try {
      await db.delete(connections).where(eq(connections.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete connection" });
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
      console.log("Creating organization with data:", req.body);

      if (!req.body.graphId) {
        return res.status(400).json({ error: "Graph ID is required" });
      }

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

      console.log("Created organization:", organization);
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
      const now = new Date();
      // Get the original graph
      const [originalGraph] = await db
        .select()
        .from(socialGraphs)
        .where(eq(socialGraphs.id, parseInt(req.params.id)));

      if (!originalGraph) {
        return res.status(404).json({ error: "Graph not found" });
      }


      // Create new graph with copied name and current timestamp
      const [newGraph] = await db
        .insert(socialGraphs)
        .values({
          name: `${originalGraph.name} (Copy)`,
          userId: req.user.id,
          modifiedAt: now,
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
          deleteAt: new Date('3099-12-31T23:59:59Z')
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