import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Core Politicians table
export const politicians = pgTable("politicians", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  party: text("party").notNull(),
  currentRole: text("current_role"),
  constituency: text("constituency").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relationship Types table
export const relationshipTypes = pgTable("relationship_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relationships between politicians
export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  sourcePoliticianId: integer("source_politician_id")
    .references(() => politicians.id)
    .notNull(),
  targetPoliticianId: integer("target_politician_id")
    .references(() => politicians.id)
    .notNull(),
  relationshipType: text("relationship_type")
    .references(() => relationshipTypes.name)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schemas for validation
export const insertPoliticianSchema = createInsertSchema(politicians);
export const selectPoliticianSchema = createSelectSchema(politicians);
export const insertRelationshipSchema = createInsertSchema(relationships);
export const selectRelationshipSchema = createSelectSchema(relationships);
export const insertRelationshipTypeSchema = createInsertSchema(relationshipTypes);
export const selectRelationshipTypeSchema = createSelectSchema(relationshipTypes);

// Types
export type Politician = typeof politicians.$inferSelect;
export type InsertPolitician = typeof politicians.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;
export type RelationshipType = typeof relationshipTypes.$inferSelect;