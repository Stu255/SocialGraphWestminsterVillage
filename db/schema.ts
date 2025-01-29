import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
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

// Affiliations table
export const affiliations = pgTable("affiliations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Core People table
export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  affiliation: text("affiliation")
    .references(() => affiliations.name)
    .notNull(),
  roleTitle: text("role_title"),
  notes: text("notes"),
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relationship Types table
export const relationshipTypes = pgTable("relationship_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relationships between people
export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  sourcePersonId: integer("source_person_id")
    .references(() => people.id)
    .notNull(),
  targetPersonId: integer("target_person_id")
    .references(() => people.id)
    .notNull(),
  relationshipType: text("relationship_type")
    .references(() => relationshipTypes.name)
    .notNull(),
  graphId: integer("graph_id").references(() => socialGraphs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

// Types
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