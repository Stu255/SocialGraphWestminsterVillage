import { pgTable, text, serial, integer, timestamp, boolean, unique, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Relationship Level Type
export const RelationshipLevel = {
  ACQUAINTED: 1,
  CONNECTED: 2,
  CLOSE: 3,
  TRUSTED: 4,
  ALLIED: 5,
} as const;

// Helper function to get relationship label
export function getRelationshipLabel(level: number): string {
  switch (level) {
    case RelationshipLevel.ALLIED: return "Allied";
    case RelationshipLevel.TRUSTED: return "Trusted";
    case RelationshipLevel.CLOSE: return "Close";
    case RelationshipLevel.CONNECTED: return "Connected";
    case RelationshipLevel.ACQUAINTED: return "Acquainted";
    default: return "Unknown";
  }
}

// Helper function to get relationship level from label
export function getRelationshipLevel(label: string): number {
  switch (label.toLowerCase()) {
    case "allied": return RelationshipLevel.ALLIED;
    case "trusted": return RelationshipLevel.TRUSTED;
    case "close": return RelationshipLevel.CLOSE;
    case "connected": return RelationshipLevel.CONNECTED;
    case "acquainted": return RelationshipLevel.ACQUAINTED;
    default: return RelationshipLevel.ACQUAINTED;
  }
}

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
});

// Core People table with all the fields from FieldSettingsDialog
export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  jobTitle: text("job_title"),
  organization: text("organization"),
  relationshipToYou: integer("relationship_to_you"), // 1-5 scale: 1=acquainted, 2=connected, 3=close, 4=trusted, 5=allied
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

// Organizations table replaces affiliations
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

// Relationship Types table (now using integer IDs 1-5)
export const relationshipTypes = pgTable("relationship_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  level: integer("level").notNull(), // 1-5 scale matching relationshipToYou
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  nameGraphIdIdx: unique("rel_type_name_graph_id_idx").on(table.name, table.graphId),
}));

// Relationships between people (using integer levels)
export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  sourcePersonId: integer("source_person_id").references(() => people.id).notNull(),
  targetPersonId: integer("target_person_id").references(() => people.id).notNull(),
  level: integer("level").notNull(), // 1-5 scale
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Custom fields for each social graph
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

// Field preferences for each social graph
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

// Schema types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SocialGraph = typeof socialGraphs.$inferSelect;
export type InsertSocialGraph = typeof socialGraphs.$inferInsert;
export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;
export type RelationshipType = typeof relationshipTypes.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;
export type CustomField = typeof customFields.$inferSelect;
export type InsertCustomField = typeof customFields.$inferInsert;
export type FieldPreference = typeof fieldPreferences.$inferSelect;
export type InsertFieldPreference = typeof fieldPreferences.$inferInsert;