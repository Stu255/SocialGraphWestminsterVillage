import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddConnectionDialog } from "./AddRelationshipDialog";

/**
 * Constants defining the relationship and connection types in the network
 * 
 * User Relationships (Node Icons):
 * - Represents relationship between user and people in their network
 * - Values 1-5, displayed as node icons
 * 
 * Network Connections (Edge Lines):
 * - Represents connections between people in the network
 * - Values 0-5, displayed as different line styles
 * - Includes "None" (0) for no connection
 */

// Define relationship types (for node icons)
export const RELATIONSHIP_TYPES = [
  { id: 5, name: "Allied", icon: "strong", description: "Strong relationship icon with up/down chevrons" },
  { id: 4, name: "Trusted", icon: "regular", description: "Regular relationship icon with down chevron" },
  { id: 3, name: "Close", icon: "basic-filled", description: "Basic filled circle icon" },
  { id: 2, name: "Familiar", icon: "basic-outline", description: "Basic outlined circle icon" },
  { id: 1, name: "Acquainted", icon: "basic-dashed", description: "Basic dashed circle icon" }
];

// Keep the CONNECTION_TYPES array exactly as is - it's the source of truth
export const CONNECTION_TYPES = [
  { id: 5, name: "Allied", style: "heavy-line", description: "Heavy solid line indicating strongest connection" },
  { id: 4, name: "Trusted", style: "double-line", description: "Double line indicating strong connection" },
  { id: 3, name: "Close", style: "standard-line", description: "Standard solid line indicating regular connection" },
  { id: 2, name: "Familiar", style: "thin-line", description: "Thin solid line indicating basic connection" },
  { id: 1, name: "Acquainted", style: "dashed-line", description: "Dashed line indicating minimal connection" },
  { id: 0, name: "None", style: "no-line", description: "No visible connection" }
];

// Helper functions for relationship type conversion (node icons)
export const getRelationshipNameById = (id: number) => {
  const type = RELATIONSHIP_TYPES.find(type => type.id === id);
  return type?.name || "Unknown";
};

export const getRelationshipIdByName = (name: string) => {
  const type = RELATIONSHIP_TYPES.find(type => type.name === name);
  return type?.id || 1; // Default to Acquainted if not found
};

// Simple helper functions with no complex logic
export const getConnectionNameById = (id: number) => {
  const type = CONNECTION_TYPES.find(type => type.id === id);
  return type?.name || "None";
};

export const getConnectionIdByName = (name: string) => {
  const type = CONNECTION_TYPES.find(type => type.name === name);
  return type?.id ?? 0;
};

interface ConnectionListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ConnectionListDialog({ open, onOpenChange }: ConnectionListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connection Types</DialogTitle>
          <DialogDescription>
            Available connection types and their visual representations in the network
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {CONNECTION_TYPES.map((type) => (
            <div key={type.id} className="flex items-center justify-between p-2 rounded-lg border">
              <div>
                <h4 className="font-medium">{type.name}</h4>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </div>
              <div className={`w-24 ${
                type.style === 'heavy-line' ? 'h-2 bg-foreground' :
                type.style === 'double-line' ? 'h-3 border-t-2 border-b-2 border-foreground' :
                type.style === 'standard-line' ? 'h-1 bg-foreground' :
                type.style === 'thin-line' ? 'h-px bg-foreground/70' :
                type.style === 'dashed-line' ? 'h-0 border-t border-dashed border-foreground/50 [border-width:1px] [border-spacing:6px]' :
                'hidden' // for "None" type
              }`} />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectionTypeManager({ graphId }: { graphId: number }) {
  const [showListDialog, setShowListDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Connections</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button 
          className="w-full"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Connection
        </Button>

        <Button 
          className="w-full"
          variant="outline"
          onClick={() => setShowListDialog(true)}
        >
          <Users className="h-4 w-4 mr-2" />
          Connection Types
        </Button>

        <ConnectionListDialog
          open={showListDialog}
          onOpenChange={setShowListDialog}
        />

        <AddConnectionDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          graphId={graphId}
        />
      </CardContent>
    </Card>
  );
}

// Export both names for compatibility
export { ConnectionTypeManager as RelationshipTypeManager };
export { ConnectionTypeManager as ConnectionManager };