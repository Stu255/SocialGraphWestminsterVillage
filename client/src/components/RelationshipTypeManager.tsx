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
import { AddRelationshipDialog } from "./AddRelationshipDialog";

/**
 * Constants defining user's relationship to each contact in their network
 * 
 * User Relationships (Node Icons):
 * - Represents how the logged-in user relates to each contact
 * - Stored as integers 1-5 in userRelationshipType field
 * - Displayed as different node icons in the graph
 */

// Define user relationship types (for node icons)
export const USER_RELATIONSHIP_TYPES = [
  { id: 5, name: "Allied", icon: "strong", description: "Strong relationship icon with up/down chevrons" },
  { id: 4, name: "Trusted", icon: "regular", description: "Regular relationship icon with down chevron" },
  { id: 3, name: "Close", icon: "basic-filled", description: "Basic filled circle icon" },
  { id: 2, name: "Familiar", icon: "basic-outline", description: "Basic outlined circle icon" },
  { id: 1, name: "Acquainted", icon: "basic-dashed", description: "Basic dashed circle icon" }
];

// Helper functions for user relationship type conversion (node icons)
export const getUserRelationshipNameById = (id: number): string => {
  const type = USER_RELATIONSHIP_TYPES.find(type => type.id === Number(id));
  return type?.name || "Acquainted"; // Default to Acquainted if not found
};

export const getUserRelationshipIdByName = (name: string): number => {
  const type = USER_RELATIONSHIP_TYPES.find(type => type.name === name);
  return type?.id || 1; // Default to Acquainted (1) if not found
};

// Export the conversion functions for backward compatibility
export const getRelationshipNameById = getUserRelationshipNameById;
export const getRelationshipIdByName = getUserRelationshipIdByName;
export const RELATIONSHIP_TYPES = USER_RELATIONSHIP_TYPES;

interface RelationshipListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function UserRelationshipListDialog({ open, onOpenChange }: RelationshipListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>User Relationship Types</DialogTitle>
          <DialogDescription>
            How you relate to each contact in your network, shown as node icons
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {USER_RELATIONSHIP_TYPES.map((type) => (
            <div key={type.id} className="flex items-center justify-between p-2 rounded-lg border">
              <div>
                <h4 className="font-medium">{type.name}</h4>
                <p className="text-sm text-muted-foreground">
                  ID: {type.id} - {type.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UserRelationshipManager({ graphId }: { graphId: number }) {
  const [showListDialog, setShowListDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Relationships</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button 
          className="w-full"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Relationship
        </Button>

        <Button 
          className="w-full"
          variant="outline"
          onClick={() => setShowListDialog(true)}
        >
          <Users className="h-4 w-4 mr-2" />
          Relationship Types
        </Button>

        <UserRelationshipListDialog
          open={showListDialog}
          onOpenChange={setShowListDialog}
        />

        <AddRelationshipDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          graphId={graphId}
        />
      </CardContent>
    </Card>
  );
}

// Export with new name for clarity
export { UserRelationshipManager as RelationshipTypeManager };