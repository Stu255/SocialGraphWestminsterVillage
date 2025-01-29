import { pgTable, text, serial, integer, timestamp, boolean, unique, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

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

// Affiliations table for organizational groupings
export const affiliations = pgTable("affiliations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  nameGraphIdIdx: unique("name_graph_id_idx").on(table.name, table.graphId),
}));

// Core People table
export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  jobTitle: text("job_title"),
  organization: text("organization"),
  lastContact: timestamp("last_contact"),
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

// Relationship Types table
export const relationshipTypes = pgTable("relationship_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  nameGraphIdIdx: unique("rel_type_name_graph_id_idx").on(table.name, table.graphId),
}));

// Relationships between people
export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  sourcePersonId: integer("source_person_id").references(() => people.id).notNull(),
  targetPersonId: integer("target_person_id").references(() => people.id).notNull(),
  relationshipType: text("relationship_type"),
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

// Schema types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SocialGraph = typeof socialGraphs.$inferSelect;
export type InsertSocialGraph = typeof socialGraphs.$inferInsert;
export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;
export type RelationshipType = typeof relationshipTypes.$inferSelect;
export type Affiliation = typeof affiliations.$inferSelect;
export type InsertAffiliation = typeof affiliations.$inferInsert;
export type CustomField = typeof customFields.$inferSelect;
export type InsertCustomField = typeof customFields.$inferInsert;
export type FieldPreference = typeof fieldPreferences.$inferSelect;
export type InsertFieldPreference = typeof fieldPreferences.$inferInsert;


// Schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertSocialGraphSchema = createInsertSchema(socialGraphs);
export const selectSocialGraphSchema = createSelectSchema(socialGraphs);
export const insertPersonSchema = createInsertSchema(people);
export const selectPersonSchema = createSelectSchema(people);
export const insertRelationshipSchema = createInsertSchema(relationships);
export const selectRelationshipSchema = createSelectSchema(relationships);
export const insertRelationshipTypeSchema = createInsertSchema(relationshipTypes);
export const selectRelationshipTypeSchema = createSelectSchema(relationshipTypes);
export const insertAffiliationSchema = createInsertSchema(affiliations);
export const selectAffiliationSchema = createSelectSchema(affiliations);
export const insertCustomFieldSchema = createInsertSchema(customFields);
export const selectCustomFieldSchema = createSelectSchema(customFields);
export const insertFieldPreferenceSchema = createInsertSchema(fieldPreferences);
export const selectFieldPreferenceSchema = createSelectSchema(fieldPreferences);