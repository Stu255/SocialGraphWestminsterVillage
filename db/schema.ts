import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Affiliations table
export const affiliations = pgTable("affiliations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Core People table
export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  affiliation: text("affiliation")
    .references(() => affiliations.name)
    .notNull(),
  currentRole: text("current_role"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relationship Types table
export const relationshipTypes = pgTable("relationship_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schemas for validation
export const insertPersonSchema = createInsertSchema(people);
export const selectPersonSchema = createSelectSchema(people);
export const insertRelationshipSchema = createInsertSchema(relationships);
export const selectRelationshipSchema = createSelectSchema(relationships);
export const insertRelationshipTypeSchema = createInsertSchema(relationshipTypes);
export const selectRelationshipTypeSchema = createSelectSchema(relationshipTypes);
export const insertAffiliationSchema = createInsertSchema(affiliations);
export const selectAffiliationSchema = createSelectSchema(affiliations);

// Types
export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;
export type RelationshipType = typeof relationshipTypes.$inferSelect;
export type Affiliation = typeof affiliations.$inferSelect;
export type InsertAffiliation = typeof affiliations.$inferInsert;