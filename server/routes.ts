import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq, or, desc, and, lt } from "drizzle-orm";
import { db } from "@db";
import multer from "multer";
import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";
import { 
  people, 
  connections, 
  connectionTypes, 
  organizations, 
  socialGraphs,
  insertPersonSchema,
  insertSocialGraphSchema,
  interactions,
  interactionContacts,
  customFields,
  fieldPreferences 
} from "@db/schema";
import { setupAuth } from "./auth";
import {interactionContacts as interactionContacts2} from "@db/schema"; 
import { parse as parseDate } from "date-fns";

function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;

  try {
    // First, clean up the input
    const cleanDate = dateStr.trim();
    console.log("Attempting to parse date:", cleanDate);

    const formats = [
      'yyyy-MM-dd',    // Standard ISO
      'MM/dd/yyyy',    // US format
      'dd/MM/yyyy',    // UK format
      'MM-dd-yyyy',    // US with dashes
      'dd-MM-yyyy',    // UK with dashes
      'M/d/yyyy',      // Short US format (Excel default)
      'd/M/yyyy',      // Short UK format
      'MMM d, yyyy',   // Month name format
      'MMMM d, yyyy',  // Full month name
      'd-MMM-yyyy',    // Excel alternative format
      'MMM-dd-yyyy',   // Another common format
      'yyyy/MM/dd',    // Alternative ISO
      'M-d-yyyy',      // Short with dashes
      'd-M-yyyy'       // Short UK with dashes
    ];

    for (const format of formats) {
      try {
        const date = parseDate(cleanDate, format, new Date());
        if (!isNaN(date.getTime())) {
          const result = date.toISOString().split('T')[0];
          console.log("Successfully parsed date:", cleanDate, "to:", result, "using format:", format);
          return result;
        }
      } catch (err) {
        continue;
      }
    }

    // If we get here, no format worked
    console.log("Failed to parse date:", cleanDate, "with any known format");
    return null;
  } catch (error) {
    console.error("Error in date normalization:", error);
    return null;
  }
}

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

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 
  }
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  const httpServer = createServer(app);

  app.get("/api/graphs", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" }); 
    }

    try {
      const now = new Date();

      const expiredGraphs = await db
        .select()
        .from(socialGraphs)
        .where(
          and(
            eq(socialGraphs.userId, req.user.id),
            lt(socialGraphs.deleteAt, now)
          )
        );

      for (const graph of expiredGraphs) {
        await db.transaction(async (tx) => {
          await tx
            .delete(connections)
            .where(eq(connections.graphId, graph.id));

          await tx
            .delete(people)
            .where(eq(people.graphId, graph.id));

          await tx
            .delete(socialGraphs)
            .where(eq(socialGraphs.id, graph.id));
        });
      }

      const graphs = await db
        .select()
        .from(socialGraphs)
        .where(eq(socialGraphs.userId, req.user.id));
      res.json(graphs);
    } catch (error) {
      console.error("Error fetching/cleaning up graphs:", error);
      res.status(500).json({ error: "Failed to fetch graphs" });
    }
  });

  app.post("/api/graphs", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
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
      return res.status(401).json({ error: "Not logged in" });
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
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
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
      const userRelationshipType = req.body.relationshipToYou;

      if (userRelationshipType !== undefined && userRelationshipType !== null) {
        const relationshipValue = Number(userRelationshipType);
        if (isNaN(relationshipValue) || relationshipValue < 0 || relationshipValue > 5) {
          return res.status(400).json({ 
            error: "Invalid relationship value. Must be a number between 0 and 5" 
          });
        }
      }

      const [updatedPerson] = await db
        .update(people)
        .set({
          name: req.body.name,
          jobTitle: req.body.jobTitle,
          organization: req.body.organization,
          userRelationshipType: userRelationshipType, 
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
      return res.status(401).json({ error: "Not logged in" });
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
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const { sourcePersonId, targetPersonId, connectionType, graphId } = req.body;

      const connection = await db.transaction(async (tx) => {
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

        const [forward] = await tx
          .insert(connections)
          .values({
            sourcePersonId,
            targetPersonId,
            connectionType,
            graphId
          })
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
      return res.status(401).json({ error: "Not logged in" });
    }
    try {
      const { sourcePersonId, targetPersonId, graphId } = req.query;
      if (!sourcePersonId || !targetPersonId || !graphId) {
        return res.status(400).json({ error: "Source ID, Target ID and Graph ID are required" });
      }

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
          return res.status(401).json({ error: "Not logged in" });
      }
      try {
          await db.delete(connections).where(eq(connections.id, parseInt(req.params.id)));
          res.json({ success: true });
      } catch (error) {
          res.status(500).json({ error: "Failed to delete connection" });
      }
    });

  app.put("/api/relationships/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const { connectionType, graphId, sourcePersonId, targetPersonId } = req.body;

      if (connectionType === undefined || connectionType === null || 
          typeof connectionType !== 'number' || 
          connectionType < 0 || connectionType > 5) {
        return res.status(400).json({ 
          error: "Invalid connection type. Must be a number between 0 and 5" 
        });
      }

      if (!req.params.id || req.params.id === 'new') {
        const [connection] = await db
          .insert(connections)
          .values({
            sourcePersonId,
            targetPersonId,
            connectionType,
            graphId
          })
          .returning();

        return res.json(connection);
      }

      const [existingConnection] = await db
        .select()
        .from(connections)
        .where(eq(connections.id, parseInt(req.params.id)));

      if (!existingConnection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      await db.transaction(async (tx) => {
        await tx
          .update(connections)
          .set({ connectionType })
          .where(eq(connections.id, parseInt(req.params.id)));

        await tx
          .update(connections)
          .set({ connectionType })
          .where(
            and(
              eq(connections.sourcePersonId, existingConnection.targetPersonId),
              eq(connections.targetPersonId, existingConnection.sourcePersonId),
              eq(connections.graphId, existingConnection.graphId)
            )
          );
      });

      const [updatedConnection] = await db
        .select()
        .from(connections)
        .where(eq(connections.id, parseInt(req.params.id)));

      res.json(updatedConnection);
    } catch (error) {
      console.error("Error updating connection:", error);
      res.status(500).json({ error: "Failed to update connection" });
    }
  });

  app.get("/api/organizations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
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
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const graphId = req.body.graphId || req.body.graph_id;
      if (!graphId) {
        return res.status(400).json({ error: "Graph ID is required" });
      }

      const [organization] = await db
        .insert(organizations)
        .values({
          name: req.body.name,
          graphId: graphId,
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
      return res.status(401).json({ error: "Not logged in" });
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

  app.put("/api/graphs/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
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
          return res.status(401).json({ error: "Not logged in" });
      }
  
      try {
          const now = new Date();
          
          const [originalGraph] = await db
              .select()
              .from(socialGraphs)
              .where(eq(socialGraphs.id, parseInt(req.params.id)));
  
          if (!originalGraph) {
              return res.status(404).json({ error: "Graph not found" });
          }
  
          
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
      return res.status(401).json({ error: "Not logged in" });
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
          return res.status(401).json({ error: "Not logged in" });
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
      return res.status(401).json({ error: "Not logged in" });
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

  app.get("/api/people/global", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const allPeople = await db
        .select({
          id: people.id,
          name: people.name,
          jobTitle: people.jobTitle,
          organization: people.organization,
          userRelationshipType: people.userRelationshipType,
          lastContact: people.lastContact,
          officeNumber: people.officeNumber,
          mobileNumber: people.mobileNumber,
          email1: people.email1,
          email2: people.email2,
          linkedin: people.linkedin,
          twitter: people.twitter,
          notes: people.notes,
          graphId: people.graphId,
          createdAt: people.createdAt,
          graphName: socialGraphs.name,
        })
        .from(people)
        .innerJoin(socialGraphs, eq(people.graphId, socialGraphs.id))
        .where(eq(socialGraphs.userId, req.user.id));

      const sortedPeople = sortPeopleByName(allPeople);
      res.json(sortedPeople);
    } catch (error) {
      console.error("Error fetching global contacts:", error);
      res.status(500).json({ error: "Failed to fetch global contacts" });
    }
  });

  app.post("/api/interactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const { type, notes, date, contactIds, graphId } = req.body;

      if (!type || !date || !contactIds || !Array.isArray(contactIds) || !graphId) {
        return res.status(400).json({ 
          error: "Missing required fields" 
        });
      }

      const interaction = await db.transaction(async (tx) => {
        const [newInteraction] = await tx
          .insert(interactions)
          .values({
            type,
            notes: notes || null,
            date: new Date(date), 
            graphId
          })
          .returning();

        for (const contactId of contactIds) {
          await tx
            .insert(interactionContacts)
            .values({
              interactionId: newInteraction.id,
              personId: contactId
            });
        }

        return newInteraction;
      });

      res.json(interaction);
    } catch (error: any) {
      console.error("Error creating interaction:", error);
      res.status(500).json({ 
        error: "Failed to create interaction",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.get("/api/interactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const { graphId, contactId } = req.query;

      if (!graphId) {
        return res.status(400).json({ error: "Graph ID is required" });
      }

      const interactionsQuery = db
        .select({
          id: interactions.id,
          type: interactions.type,
          notes: interactions.notes,
          date: interactions.date,
          createdAt: interactions.createdAt,
        })
        .from(interactions)
        .where(eq(interactions.graphId, Number(graphId)));

      if (contactId) {
        interactionsQuery
          .innerJoin(
            interactionContacts,
            eq(interactions.id, interactionContacts.interactionId)
          )
          .where(eq(interactionContacts.personId, Number(contactId)));
      }

      const interactionsData = await interactionsQuery;
      res.json(interactionsData);
    } catch (error: any) {
      console.error("Error fetching interactions:", error);
      res.status(500).json({ 
        error: "Failed to fetch interactions",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.get("/api/contacts/template", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const headers = [
        'name',
        'jobTitle',
        'organization',
        'userRelationshipType',
        'lastContact',
        'officeNumber',
        'mobileNumber',
        'email1',
        'email2',
        'linkedin',
        'twitter',
        'notes'
      ];

      const csvContent = stringify([headers]);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=contacts_template.csv');

      res.send(csvContent);
    } catch (error) {
      console.error("Error generating CSV template:", error);
      res.status(500).json({ error: "Failed to generate CSV template" });
    }
  });

  app.post("/api/contacts/upload", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      // Parse CSV with from_line: 2 to skip the header row
      const records = parse(req.file.buffer.toString(), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        from_line: 2 // Skip the header row
      });

      console.log("Parsed records:", records);

      const results = {
        added: 0,
        updated: 0,
        errors: [] as string[]
      };

      const graphs = await db
        .select()
        .from(socialGraphs)
        .where(eq(socialGraphs.userId, req.user.id));

      if (graphs.length === 0) {
        return res.status(400).json({ error: "No graphs found for user" });
      }

      const defaultGraphId = graphs[0].id;

      for (const [index, record] of records.entries()) {
        try {
          // Skip empty rows or template example rows
          if (!record.name || record.name.includes("(Required)") || record.name.toLowerCase().includes("full name")) {
            continue;
          }

          let normalizedLastContact = null;
          if (record.lastContact) {
            normalizedLastContact = normalizeDate(record.lastContact);
            if (!normalizedLastContact) {
              results.errors.push(
                `Row ${index + 2}: Could not parse date "${record.lastContact}". ` +
                `Please use one of these formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, M/D/YYYY`
              );
              continue;
            }
          }

          const personData = {
            name: record.name,
            jobTitle: record.jobTitle || null,
            organization: record.organization || null,
            userRelationshipType: parseInt(record.userRelationshipType) || 1,
            lastContact: normalizedLastContact,
            officeNumber: record.officeNumber || null,
            mobileNumber: record.mobileNumber || null,            email1: record.email1 || null,
            email2: record.email2 || null,
            linkedin: record.linkedin || null,
            twitter: record.twitter || null,
            notes: record.notes || null,
            graphId: defaultGraphId
          };

          const validationResult = insertPersonSchema.safeParse(personData);
          if (!validationResult.success) {
            results.errors.push(
              `Row ${index + 2}: ${validationResult.error.issues.map(i => i.message).join(", ")}`
            );
            continue;
          }

          const existingPerson = await db
            .select()
            .from(people)
            .where(and(
              eq(people.name, personData.name),
              eq(people.graphId, defaultGraphId)
            ));

          if (existingPerson.length > 0) {
            await db
              .update(people)
              .set(personData)
              .where(eq(people.id, existingPerson[0].id));
            results.updated++;
          } else {
            await db.insert(people).values(personData);
            results.added++;
          }
        } catch (error) {
          console.error(`Error processing row ${index + 2}:`, error);
          results.errors.push(`Row ${index + 2}: Failed to process record`);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error processing CSV upload:", error);
      res.status(500).json({ 
        error: "Failed to process CSV upload",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  app.get("/api/people/global", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const allPeople = await db
        .select({
          id: people.id,
          name: people.name,
          jobTitle: people.jobTitle,
          organization: people.organization,
          userRelationshipType: people.userRelationshipType,
          lastContact: people.lastContact,
          officeNumber: people.officeNumber,
          mobileNumber: people.mobileNumber,
          email1: people.email1,
          email2: people.email2,
          linkedin: people.linkedin,
          twitter: people.twitter,
          notes: people.notes,
          graphId: people.graphId,
          createdAt: people.createdAt,
          graphName: socialGraphs.name,
        })
        .from(people)
        .innerJoin(socialGraphs, eq(people.graphId, socialGraphs.id))
        .where(eq(socialGraphs.userId, req.user.id));

      const sortedPeople = sortPeopleByName(allPeople);
      res.json(sortedPeople);
    } catch (error) {
      console.error("Error fetching global contacts:", error);
      res.status(500).json({ error: "Failed to fetch global contacts" });
    }
  });

  app.post("/api/interactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const { type, notes, date, contactIds, graphId } = req.body;

      if (!type || !date || !contactIds || !Array.isArray(contactIds) || !graphId) {
        return res.status(400).json({ 
          error: "Missing required fields" 
        });
      }

      const interaction = await db.transaction(async (tx) => {
        const [newInteraction] = await tx
          .insert(interactions)
          .values({
            type,
            notes: notes || null,
            date: new Date(date), 
            graphId
          })
          .returning();

        for (const contactId of contactIds) {
          await tx
            .insert(interactionContacts)
            .values({
              interactionId: newInteraction.id,
              personId: contactId
            });
        }

        return newInteraction;
      });

      res.json(interaction);
    } catch (error: any) {
      console.error("Error creating interaction:", error);
      res.status(500).json({ 
        error: "Failed to create interaction",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.get("/api/interactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const { graphId, contactId } = req.query;

      if (!graphId) {
        return res.status(400).json({ error: "Graph ID is required" });
      }

      const interactionsQuery = db
        .select({
          id: interactions.id,
          type: interactions.type,
          notes: interactions.notes,
          date: interactions.date,
          createdAt: interactions.createdAt,
        })
        .from(interactions)
        .where(eq(interactions.graphId, Number(graphId)));

      if (contactId) {
        interactionsQuery
          .innerJoin(
            interactionContacts,
            eq(interactions.id, interactionContacts.interactionId)
          )
          .where(eq(interactionContacts.personId, Number(contactId)));
      }

      const interactionsData = await interactionsQuery;
      res.json(interactionsData);
    } catch (error: any) {
      console.error("Error fetching interactions:", error);
      res.status(500).json({ 
        error: "Failed to fetch interactions",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.get("/api/contacts/template", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const headers = [
        'name',
        'jobTitle',
        'organization',
        'userRelationshipType',
        'lastContact',
        'officeNumber',
        'mobileNumber',
        'email1',
        'email2',
        'linkedin',
        'twitter',
        'notes'
      ];

      const csvContent = stringify([headers]);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=contacts_template.csv');

      res.send(csvContent);
    } catch (error) {
      console.error("Error generating CSV template:", error);
      res.status(500).json({ error: "Failed to generate CSV template" });
    }
  });

  app.post("/api/contacts/upload", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      // Parse CSV with from_line: 2 to skip the header row
      const records = parse(req.file.buffer.toString(), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        from_line: 2 // Skip the header row
      });

      console.log("Parsed records:", records);

      const results = {
        added: 0,
        updated: 0,
        errors: [] as string[]
      };

      const graphs = await db
        .select()
        .from(socialGraphs)
        .where(eq(socialGraphs.userId, req.user.id));

      if (graphs.length === 0) {
        return res.status(400).json({ error: "No graphs found for user" });
      }

      const defaultGraphId = graphs[0].id;

      for (const [index, record] of records.entries()) {
        try {
          // Skip empty rows or template example rows
          if (!record.name || record.name.includes("(Required)") || record.name.toLowerCase().includes("full name")) {
            continue;
          }

          let normalizedLastContact = null;
          if (record.lastContact) {
            normalizedLastContact = normalizeDate(record.lastContact);
            if (!normalizedLastContact) {
              results.errors.push(
                `Row ${index + 2}: Could not parse date "${record.lastContact}". ` +
                `Please use one of these formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, M/D/YYYY`
              );
              continue;
            }
          }

          const personData = {
            name: record.name,
            jobTitle: record.jobTitle || null,
            organization: record.organization || null,
            userRelationshipType: parseInt(record.userRelationshipType) || 1,
            lastContact: normalizedLastContact,
            officeNumber: record.officeNumber || null,
            mobileNumber: record.mobileNumber || null,
            email1: record.email1 || null,
            email2: record.email2 || null,
            linkedin: record.linkedin || null,
            twitter: record.twitter || null,
            notes: record.notes || null,
            graphId: defaultGraphId
          };

          const validationResult = insertPersonSchema.safeParse(personData);
          if (!validationResult.success) {
            results.errors.push(
              `Row ${index + 2}: ${validationResult.error.issues.map(i => i.message).join(", ")}`
            );
            continue;
          }

          const existingPerson = await db
            .select()
            .from(people)
            .where(and(
              eq(people.name, personData.name),
              eq(people.graphId, defaultGraphId)
            ));

          if (existingPerson.length > 0) {
            await db
              .update(people)
              .set(personData)
              .where(eq(people.id, existingPerson[0].id));
            results.updated++;
          } else {
            await db.insert(people).values(personData);
            results.added++;
          }
        } catch (error) {
          console.error(`Error processing row ${index + 2}:`, error);
          results.errors.push(`Row ${index + 2}: Failed to process record`);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error processing CSV upload:", error);
      res.status(500).json({ 
        error: "Failed to process CSV upload",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  app.get("/api/organizations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
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
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const graphId = req.body.graphId || req.body.graph_id;
      if (!graphId) {
        return res.status(400).json({ error: "Graph ID is required" });
      }

      const [organization] = await db
        .insert(organizations)
        .values({
          name: req.body.name,
          graphId: graphId,
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
      return res.status(401).json({ error: "Not logged in" });
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

  app.put("/api/graphs/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
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
          return res.status(401).json({ error: "Not logged in" });
      }
  
      try {
          const now = new Date();
          
          const [originalGraph] = await db
              .select()
              .from(socialGraphs)
              .where(eq(socialGraphs.id, parseInt(req.params.id)));
  
          if (!originalGraph) {
              return res.status(404).json({ error: "Graph not found" });
          }
  
          
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
      return res.status(401).json({ error: "Not logged in" });
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
          return res.status(401).json({ error: "Not logged in" });
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
      return res.status(401).json({ error: "Not logged in" });
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

  app.get("/api/people/global", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const allPeople = await db
        .select({
          id: people.id,
          name: people.name,
          jobTitle: people.jobTitle,
          organization: people.organization,
          userRelationshipType: people.userRelationshipType,
          lastContact: people.lastContact,
          officeNumber: people.officeNumber,
          mobileNumber: people.mobileNumber,
          email1: people.email1,
          email2: people.email2,
          linkedin: people.linkedin,
          twitter: people.twitter,
          notes: people.notes,
          graphId: people.graphId,
          createdAt: people.createdAt,
          graphName: socialGraphs.name,
        })
        .from(people)
        .innerJoin(socialGraphs, eq(people.graphId, socialGraphs.id))
        .where(eq(socialGraphs.userId, req.user.id));

      const sortedPeople = sortPeopleByName(allPeople);
      res.json(sortedPeople);
    } catch (error) {
      console.error("Error fetching global contacts:", error);
      res.status(500).json({ error: "Failed to fetch global contacts" });
    }
  });

  app.post("/api/interactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const { type, notes, date, contactIds, graphId } = req.body;

      if (!type || !date || !contactIds || !Array.isArray(contactIds) || !graphId) {
        return res.status(400).json({ 
          error: "Missing required fields" 
        });
      }

      const interaction = await db.transaction(async (tx) => {
        const [newInteraction] = await tx
          .insert(interactions)
          .values({
            type,
            notes: notes || null,
            date: new Date(date), 
            graphId
          })
          .returning();

        for (const contactId of contactIds) {
          await tx
            .insert(interactionContacts)
            .values({
              interactionId: newInteraction.id,
              personId: contactId
            });
        }

        return newInteraction;
      });

      res.json(interaction);
    } catch (error: any) {
      console.error("Error creating interaction:", error);
      res.status(500).json({ 
        error: "Failed to create interaction",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.get("/api/interactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const { graphId, contactId } = req.query;

      if (!graphId) {
        return res.status(400).json({ error: "Graph ID is required" });
      }

      const interactionsQuery = db
        .select({
          id: interactions.id,
          type: interactions.type,
          notes: interactions.notes,
          date: interactions.date,
          createdAt: interactions.createdAt,
        })
        .from(interactions)
        .where(eq(interactions.graphId, Number(graphId)));

      if (contactId) {
        interactionsQuery
          .innerJoin(
            interactionContacts,
            eq(interactions.id, interactionContacts.interactionId)
          )
          .where(eq(interactionContacts.personId, Number(contactId)));
      }

      const interactionsData = await interactionsQuery;
      res.json(interactionsData);
    } catch (error: any) {
      console.error("Error fetching interactions:", error);
      res.status(500).json({ 
        error: "Failed to fetch interactions",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.get("/api/contacts/template", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    try {
      const headers = [
        'name',
        'jobTitle',
        'organization',
        'userRelationshipType',
        'lastContact',
        'officeNumber',
        'mobileNumber',
        'email1',
        'email2',
        'linkedin',
        'twitter',
        'notes'
      ];

      const csvContent = stringify([headers]);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=contacts_template.csv');

      res.send(csvContent);
    } catch (error) {
      console.error("Error generating CSV template:", error);
      res.status(500).json({ error: "Failed to generate CSV template" });
    }
  });

  app.post("/api/contacts/upload", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      // Parse CSV with from_line: 2 to skip the header row
      const records = parse(req.file.buffer.toString(), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        from_line: 2 // Skip the header row
      });

      console.log("Parsed records:", records);

      const results = {
        added: 0,
        updated: 0,
        errors: [] as string[]
      };

      const graphs = await db
        .select()
        .from(socialGraphs)
        .where(eq(socialGraphs.userId, req.user.id));

      if (graphs.length === 0) {
        return res.status(400).json({ error: "No graphs found for user" });
      }

      const defaultGraphId = graphs[0].id;

      for (const [index, record] of records.entries()) {
        try {
          // Skip empty rows or template example rows
          if (!record.name || record.name.includes("(Required)") || record.name.toLowerCase().includes("full name")) {
            continue;
          }

          let normalizedLastContact = null;
          if (record.lastContact) {
            normalizedLastContact = normalizeDate(record.lastContact);
            if (!normalizedLastContact) {
              results.errors.push(
                `Row ${index + 2}: Could not parse date "${record.lastContact}". ` +
                `Please use one of these formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, M/D/YYYY`
              );
              continue;
            }
          }

          const personData = {
            name: record.name,
            jobTitle: record.jobTitle || null,
            organization: record.organization || null,
            userRelationshipType: parseInt(record.userRelationshipType) || 1,
            lastContact: normalizedLastContact,
            officeNumber: record.officeNumber || null,
            mobileNumber: record.mobileNumber || null,
            email1: record.email1 || null,
            email2: record.email2 || null,
            linkedin: record.linkedin || null,
            twitter: record.twitter || null,
            notes: record.notes || null,
            graphId: defaultGraphId
          };

          const validationResult = insertPersonSchema.safeParse(personData);
          if (!validationResult.success) {
            results.errors.push(
              `Row ${index + 2}: ${validationResult.error.issues.map(i => i.message).join(", ")}`
            );
            continue;
          }

          const existingPerson = await db
            .select()
            .from(people)
            .where(and(
              eq(people.name, personData.name),
              eq(people.graphId, defaultGraphId)
            ));

          if (existingPerson.length > 0) {
            await db
              .update(people)
              .set(personData)
              .where(eq(people.id, existingPerson[0].id));
            results.updated++;
          } else {
            await db.insert(people).values(personData);
            results.added++;
          }
        } catch (error) {
          console.error(`Error processing row ${index + 2}:`, error);
          results.errors.push(`Row ${index + 2}: Failed to process record`);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error processing CSV upload:", error);
      res.status(500).json({ 
        error: "Failed to process CSV upload",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  return httpServer;
}