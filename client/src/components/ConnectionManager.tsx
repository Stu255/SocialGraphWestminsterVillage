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
import { AddConnectionDialog } from "./AddConnectionDialog";

/**
 * Constants defining the connection types between contacts
 * 
 * Contact Connections (Edge Lines):
 * - Represents frequency and strength of contact between people
 * - Values 0-5, displayed as different line styles
 * - Includes "None" (0) for no meaningful connection
 */

// Define connection types (for edge lines)
export const CONNECTION_TYPES = [
  { 
    id: 5, 
    name: "Allied", 
    style: "double-heavy-line", 
    description: "Life long trusted connections with allied interests" 
  },
  { 
    id: 4, 
    name: "Trusted", 
    style: "double-line", 
    description: "Long lasting / permanent trusted connections" 
  },
  { 
    id: 3, 
    name: "Close", 
    style: "standard-line", 
    description: "Contact on a weekly/daily basis" 
  },
  { 
    id: 2, 
    name: "Familiar", 
    style: "thin-line", 
    description: "Contact on a monthly/weekly basis" 
  },
  { 
    id: 1, 
    name: "Acquainted", 
    style: "thin-dashed-line", 
    description: "Contact on a quarterly/monthly basis" 
  },
  { 
    id: 0, 
    name: "None", 
    style: "no-line", 
    description: "No meaningful connection" 
  }
];

// Helper functions for connection types (edge lines)
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
          <DialogTitle>Contact Connection Types</DialogTitle>
          <DialogDescription>
            How frequently contacts interact with each other, shown as lines between nodes
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
                type.style === 'double-heavy-line' ? 'h-4 flex flex-col justify-between' : 
                type.style === 'double-line' ? 'h-3 flex flex-col justify-between' :
                type.style === 'standard-line' ? 'h-1 bg-foreground' :
                type.style === 'thin-line' ? 'h-px bg-foreground/70' :
                type.style === 'thin-dashed-line' ? 'h-0 border-t border-dashed border-foreground/50 [border-width:0.5px]' :
                'hidden' // for "None" type
              }`}>
                {(type.style === 'double-heavy-line' || type.style === 'double-line') && (
                  <>
                    <div className={`w-full bg-foreground ${type.style === 'double-heavy-line' ? 'h-1.5' : 'h-0.5'}`} />
                    <div className={`w-full bg-foreground ${type.style === 'double-heavy-line' ? 'h-1.5' : 'h-0.5'}`} />
                  </>
                )}
              </div>
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
        <CardTitle>Contact Connections</CardTitle>
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