# Professional Network Manager

## Core Concepts

This codebase deals with two distinct concepts that must not be confused:

### 1. User Relationships (User → Contact)
- Represents how the logged-in user relates to each contact
- Stored as integers 1-5 in the `userRelationshipType` field
- Displayed as different node icons in the graph
- Labels: Acquainted (1), Familiar (2), Close (3), Trusted (4), Allied (5)
- Visual: Node icons with different styles (basic circle, circle with chevrons, etc.)
- Database: `people.userRelationshipType` column
- Purpose: Shows how well the user knows each contact
- UI: Managed through "Your Relationships" panel
- Components: `UserRelationshipManager.tsx`, `AddRelationshipDialog.tsx`

### 2. Contact Connections (Contact ↔ Contact)
- Represents how two contacts are connected to each other
- Stored as integers 0-5 in the `connectionType` field
- Displayed as edges (lines) between nodes in the graph
- Labels: None (0), Acquainted (1), Familiar (2), Close (3), Trusted (4), Allied (5)
- Visual: Lines with different styles (dashed, thin, standard, double, heavy)
- Database: `connections` table with `connectionType` column
- Purpose: Shows how contacts are interconnected with each other
- UI: Managed through "Contact Connections" panel
- Components: `ConnectionManager.tsx`, `AddConnectionDialog.tsx`

## Implementation Rules

1. Variable/Function Naming:
   - Use "relationship" ONLY for user-to-contact relationships
   - Use "connection" ONLY for contact-to-contact connections
   - Never mix these terms or use them interchangeably

2. Database Schema:
   - `people.userRelationshipType`: How user relates to a contact (1-5)
   - `connections.connectionType`: How contacts relate to each other (0-5)

3. UI Components:
   - Node icons represent user relationships
   - Edge lines represent contact connections
   - Keep these visually distinct

4. Code Organization:
   - Separate logic for managing relationships vs connections
   - Use clear naming to prevent confusion
   - Keep relationship and connection state management separate

## Warning for Future Development

DO NOT confuse or combine:
- Relationships (user→contact) with Connections (contact↔contact)
- Node properties with Edge properties
- `userRelationshipType` with `connectionType`

These represent fundamentally different concepts in the application.

## Visual Reference

Node Icons (User Relationships):
- Allied (5): Circle with up/down chevrons
- Trusted (4): Circle with down chevron
- Close (3): Filled circle
- Familiar (2): Outlined circle
- Acquainted (1): Dashed circle

Edge Lines (Contact Connections):
- Allied (5): Heavy solid line
- Trusted (4): Double line
- Close (3): Standard solid line
- Familiar (2): Thin solid line
- Acquainted (1): Dashed line
- None (0): No line

## LLM Development Guidelines

IMPORTANT: For any LLM working on this codebase:

1. Terminology Firewall:
   - "relationship" ONLY refers to user-contact relationship (node icons)
   - "connection" ONLY refers to contact-contact connections (edge lines)
   - These terms are NOT interchangeable

2. Visual Elements:
   - Nodes = Contacts with relationship-based icons
   - Edges = Lines showing connections between contacts

3. Code Changes:
   - When modifying relationship code, only touch user-contact relationship logic
   - When modifying connection code, only touch contact-contact connection logic
   - Never mix these concerns

4. Database:
   - userRelationshipType column in people table = How user relates to contact
   - connectionType column in connections table = How contacts relate to each other

Remember: Relationships and Connections are completely separate concepts!