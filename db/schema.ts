import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Core Politicians table
export const politicians = pgTable("politicians", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  party: text("party").notNull(),
  currentRole: text("current_role"),
  constituency: text("constituency").notNull(),
});

// Simple relationships between politicians
export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  sourcePoliticianId: integer("source_politician_id")
    .references(() => politicians.id)
    .notNull(),
  targetPoliticianId: integer("target_politician_id")
    .references(() => politicians.id)
    .notNull(),
  relationshipType: text("relationship_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Basic relations
export const politiciansRelations = relations(politicians, ({ many }) => ({
  outgoingRelations: many(relationships),
  incomingRelations: many(relationships)
}));

// Schemas for validation
export const insertPoliticianSchema = createInsertSchema(politicians);
export const selectPoliticianSchema = createSelectSchema(politicians);
export const insertRelationshipSchema = createInsertSchema(relationships);
export const selectRelationshipSchema = createSelectSchema(relationships);

// Types
export type Politician = typeof politicians.$inferSelect;
export type InsertPolitician = typeof politicians.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;