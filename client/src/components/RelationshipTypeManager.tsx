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

// Define connection types with scores and their line styles
export const CONNECTION_TYPES = [
  { id: 5, name: "Strong Connection", style: "heavy-line", description: "Heavy line" },
  { id: 4, name: "Regular Connection", style: "double-line", description: "Double line" },
  { id: 3, name: "Moderate Connection", style: "standard-line", description: "Standard line" },
  { id: 2, name: "Light Connection", style: "thin-line", description: "Thin line" },
  { id: 1, name: "Weak Connection", style: "dashed-line", description: "Thin dashed line" }
];

// For backward compatibility and to avoid breaking changes
export const RELATIONSHIP_TYPES = [
  { id: 5, name: "Strong Relationship", style: "heavy-line", description: "Heavy line" },
  { id: 4, name: "Regular Relationship", style: "double-line", description: "Double line" },
  { id: 3, name: "Moderate Relationship", style: "standard-line", description: "Standard line" },
  { id: 2, name: "Light Relationship", style: "thin-line", description: "Thin line" },
  { id: 1, name: "Weak Relationship", style: "dashed-line", description: "Thin dashed line" }
];

// Helper functions for connection type conversion
export const getConnectionNameById = (id: number) => {
  const type = CONNECTION_TYPES.find(type => type.id === id);
  return type?.name || "Unknown";
};

export const getConnectionIdByName = (name: string) => {
  const type = CONNECTION_TYPES.find(type => type.name === name);
  return type?.id || null;
};

// Keep old function names for backward compatibility
export const getRelationshipNameById = getConnectionNameById;
export const getRelationshipIdByName = getConnectionIdByName;

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
                'h-0 border-t border-dashed border-foreground/50 [border-width:1px] [border-spacing:6px]'
              }`} />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectionManager({ graphId }: { graphId: number }) {
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

// Re-export for backward compatibility
export { ConnectionManager as RelationshipTypeManager };