import { pgTable, text, serial, integer, timestamp, boolean, unique, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Naming Convention:
 * 
 * 1. Relationships (Node Icons):
 *    - Represents the relationship between the user and people in their network
 *    - Stored as integers 1-5 in the database
 *    - UI labels: Allied (5), Trusted (4), Close (3), Familiar (2), Acquainted (1)
 *    - Represented by different node icons in the graph
 * 
 * 2. Connections (Edges):
 *    - Represents connections between people in the network
 *    - Stored as integers 0-5 in the database
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

// Core People table with all the fields from FieldSettingsDialog
export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  jobTitle: text("job_title"),
  organization: text("organization"),
  userRelationshipType: integer("user_relationship_type").notNull().default(1), // 1-5: Acquainted to Allied
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

// Connection Types table (renamed from relationshipTypes)
export const connectionTypes = pgTable("connection_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  nameGraphIdIdx: unique("conn_type_name_graph_id_idx").on(table.name, table.graphId),
}));

// Connections between people (renamed from relationships)
export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  sourcePersonId: integer("source_person_id").references(() => people.id).notNull(),
  targetPersonId: integer("target_person_id").references(() => people.id).notNull(),
  connectionType: integer("connection_type").notNull().default(0), // 0-5: None to Allied
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Rest of the schema remains unchanged
export const customFields = pgTable("custom_fields", {
  id: serial("id").primaryKey(),
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  fieldName: text("field_name").notNull(),
  fieldType: text("field_type").notNull(),
  isRequired: boolean("is_required").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  fieldNameGraphIdIdx: unique("field_name_graph_id_idx").on(table.fieldName, table.graphId),
}));

export const fieldPreferences = pgTable("field_preferences", {
  id: serial("id").primaryKey(),
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  preferences: jsonb("preferences").notNull().$type<{
    order: string[];
    hidden: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  graphIdIdx: unique("graph_id_idx").on(table.graphId),
}));

// Custom insert schema for people to handle date conversion
const insertPeopleSchema = createInsertSchema(people, {
  lastContact: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .transform(val => val ? new Date(val) : null)
    .optional()
    .nullable(),
  userRelationshipType: z.number().min(1).max(5),
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
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertSocialGraphSchema = createInsertSchema(socialGraphs);
export const selectSocialGraphSchema = createSelectSchema(socialGraphs);
export const insertPersonSchema = insertPeopleSchema;
export const selectPersonSchema = createSelectSchema(people);
export const insertConnectionSchema = createInsertSchema(connections);
export const selectConnectionSchema = createSelectSchema(connections);
export const insertConnectionTypeSchema = createInsertSchema(connectionTypes);
export const selectConnectionTypeSchema = createSelectSchema(connectionTypes);
export const insertOrganizationSchema = createInsertSchema(organizations);
export const selectOrganizationSchema = createSelectSchema(organizations);
export const insertCustomFieldSchema = createInsertSchema(customFields);
export const selectCustomFieldSchema = createSelectSchema(customFields);
export const insertFieldPreferenceSchema = createInsertSchema(fieldPreferences);
export const selectFieldPreferenceSchema = createSelectSchema(fieldPreferences);

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
export type CustomField = typeof customFields.$inferSelect;
export type InsertCustomField = typeof customFields.$inferInsert;
export type FieldPreference = typeof fieldPreferences.$inferSelect;
export type InsertFieldPreference = typeof fieldPreferences.$inferInsert;