import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Politicians/MPs table
export const politicians = pgTable("politicians", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  constituency: text("constituency").notNull(),
  party: text("party").notNull(),
  currentRole: text("current_role"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Committees table
export const committees = pgTable("committees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

// Committee memberships
export const committeeMemberships = pgTable("committee_memberships", {
  id: serial("id").primaryKey(),
  politicianId: integer("politician_id").references(() => politicians.id).notNull(),
  committeeId: integer("committee_id").references(() => committees.id).notNull(),
  role: text("role").default("member"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
});

// Historical positions
export const historicalPositions = pgTable("historical_positions", {
  id: serial("id").primaryKey(),
  politicianId: integer("politician_id").references(() => politicians.id).notNull(),
  role: text("role").notNull(),
  department: text("department"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
});

// Relationships between politicians
export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  sourcePoliticianId: integer("source_politician_id").references(() => politicians.id).notNull(),
  targetPoliticianId: integer("target_politician_id").references(() => politicians.id).notNull(),
  relationshipType: text("relationship_type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  notes: text("notes"),
});

// Define relations
export const politicianRelations = relations(politicians, ({ many }) => ({
  committeeMemberships: many(committeeMemberships),
  historicalPositions: many(historicalPositions),
  outgoingRelations: many(relationships, {
    fields: [politicians.id],
    references: [relationships.sourcePoliticianId],
  }),
  incomingRelations: many(relationships, {
    fields: [politicians.id],
    references: [relationships.targetPoliticianId],
  }),
}));

export const committeeRelations = relations(committees, ({ many }) => ({
  memberships: many(committeeMemberships),
}));

export const committeeMembershipRelations = relations(committeeMemberships, ({ one }) => ({
  politician: one(politicians, {
    fields: [committeeMemberships.politicianId],
    references: [politicians.id],
  }),
  committee: one(committees, {
    fields: [committeeMemberships.committeeId],
    references: [committees.id],
  }),
}));

export const historicalPositionRelations = relations(historicalPositions, ({ one }) => ({
  politician: one(politicians, {
    fields: [historicalPositions.politicianId],
    references: [politicians.id],
  }),
}));

export const relationshipRelations = relations(relationships, ({ one }) => ({
  sourcePolitician: one(politicians, {
    fields: [relationships.sourcePoliticianId],
    references: [politicians.id],
  }),
  targetPolitician: one(politicians, {
    fields: [relationships.targetPoliticianId],
    references: [politicians.id],
  }),
}));

// Schemas
export const insertPoliticianSchema = createInsertSchema(politicians);
export const selectPoliticianSchema = createSelectSchema(politicians);
export const insertCommitteeSchema = createInsertSchema(committees);
export const selectCommitteeSchema = createSelectSchema(committees);
export const insertRelationshipSchema = createInsertSchema(relationships);
export const selectRelationshipSchema = createSelectSchema(relationships);

// Types
export type Politician = typeof politicians.$inferSelect;
export type InsertPolitician = typeof politicians.$inferInsert;
export type Committee = typeof committees.$inferSelect;
export type Relationship = typeof relationships.$inferSelect;