import { pgTable, text, serial, integer, timestamp, boolean, unique, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Naming Convention:
 * 
 * 1. User Relationships (Node Icons):
 *    - Represents how the logged-in user relates to each contact
 *    - Stored as integers 1-5 in userRelationshipType
 *    - UI labels: Allied (5), Trusted (4), Close (3), Familiar (2), Acquainted (1)
 *    - Represented by different node icons in the graph
 * 
 * 2. Contact Connections (Edges):
 *    - Represents how contacts are connected to each other
 *    - Stored as integers 0-5 in connectionType
 *    - UI labels: None (0), Allied (5), Trusted (4), Close (3), Familiar (2), Acquainted (1)
 *    - Represented by different line styles in the graph
 */

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Social Graphs table to store different networks per user
export const socialGraphs = pgTable("social_graphs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  modifiedAt: timestamp("modified_at").defaultNow().notNull(),
  deleteAt: timestamp("delete_at"),
});

// Core People table with all contact fields
export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  jobTitle: text("job_title"),
  organization: text("organization"),
  userRelationshipType: integer("user_relationship_type").notNull().default(1), // 1-5: How user relates to this contact
  lastContact: date("last_contact"),
  officeNumber: text("office_number"),
  mobileNumber: text("mobile_number"),
  email1: text("email_1"),
  email2: text("email_2"),
  linkedin: text("linkedin"),
  twitter: text("twitter"),
  notes: text("notes"),
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Organizations table
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brandColor: text("brand_color").notNull(),
  accentColor: text("accent_color").notNull(),
  website: text("website"),
  industry: text("industry"),
  hqCity: text("hq_city"),
  headcount: integer("headcount"),
  turnover: text("turnover"),
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Connection Types table
export const connectionTypes = pgTable("connection_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  nameGraphIdIdx: unique("conn_type_name_graph_id_idx").on(table.name, table.graphId),
}));

// Connections between contacts
export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  sourcePersonId: integer("source_person_id").references(() => people.id).notNull(),
  targetPersonId: integer("target_person_id").references(() => people.id).notNull(),
  connectionType: integer("connection_type").notNull().default(0), // 0-5: How contacts are connected
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Interactions table to store contact interactions
export const interactions = pgTable("interactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // email, message, call, meeting, event
  notes: text("notes"),
  date: timestamp("date").notNull(),
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Junction table for interactions and contacts
export const interactionContacts = pgTable("interaction_contacts", {
  id: serial("id").primaryKey(),
  interactionId: integer("interaction_id")
    .references(() => interactions.id)
    .notNull(),
  personId: integer("person_id")
    .references(() => people.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueInteractionPerson: unique("unique_interaction_person_idx").on(
    table.interactionId,
    table.personId
  ),
}));

// Update the schemas to reflect the correct naming
export const insertPersonSchema = createInsertSchema(people, {
  lastContact: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .transform(val => val ? new Date(val) : null)
    .optional()
    .nullable(),
  userRelationshipType: z.number().min(1).max(5).default(1),
  graphId: z.number(),
  name: z.string().min(1, "Name is required"),
  jobTitle: z.string().nullable(),
  organization: z.string().nullable(),
  officeNumber: z.string().nullable(),
  mobileNumber: z.string().nullable(),
  email1: z.string().nullable(),
  email2: z.string().nullable(),
  linkedin: z.string().nullable(),
  twitter: z.string().nullable(),
  notes: z.string().nullable(),
});

// Export the schemas
export const insertOrganizationSchema = createInsertSchema(organizations);
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertSocialGraphSchema = createInsertSchema(socialGraphs);
export const selectSocialGraphSchema = createSelectSchema(socialGraphs);
export const selectPersonSchema = createSelectSchema(people);
export const insertConnectionSchema = createInsertSchema(connections);
export const selectConnectionSchema = createSelectSchema(connections);
export const insertConnectionTypeSchema = createInsertSchema(connectionTypes);
export const selectConnectionTypeSchema = createSelectSchema(connectionTypes);
export const selectOrganizationSchema = createSelectSchema(organizations);
export const insertInteractionSchema = createInsertSchema(interactions);
export const selectInteractionSchema = createSelectSchema(interactions);
export const insertInteractionContactSchema = createInsertSchema(interactionContacts);
export const selectInteractionContactSchema = createSelectSchema(interactionContacts);


// Schema types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SocialGraph = typeof socialGraphs.$inferSelect;
export type InsertSocialGraph = typeof socialGraphs.$inferInsert;
export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;
export type Connection = typeof connections.$inferSelect;
export type ConnectionType = typeof connectionTypes.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;
export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = typeof interactions.$inferInsert;
export type InteractionContact = typeof interactionContacts.$inferSelect;
export type InsertInteractionContact = typeof interactionContacts.$inferInsert;