import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";
import { AddConnectionDialog } from "./AddConnectionDialog";

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

export const getConnectionNameById = (id: number) => {
  const type = CONNECTION_TYPES.find(type => type.id === id);
  return type?.name || "None";
};

export const getConnectionIdByName = (name: string) => {
  const type = CONNECTION_TYPES.find(type => type.name === name);
  return type?.id ?? 0;
};

interface ConnectionManagerProps {
  graphId: number;
  title?: string;
}

export function ConnectionManager({ graphId, title = "Connections" }: ConnectionManagerProps) {
  const [showListDialog, setShowListDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button 
          className="w-full justify-start"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Connection
        </Button>

        <Button 
          className="w-full justify-start"
          variant="outline"
          onClick={() => setShowListDialog(true)}
        >
          <Users className="h-4 w-4 mr-2" />
          Connection Types
        </Button>

        <AddConnectionDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          graphId={graphId}
        />

        {showListDialog && (
          <div className="space-y-2 mt-2">
            {CONNECTION_TYPES.map((type) => (
              <div key={type.id} className="flex items-center justify-between p-2 rounded-lg border bg-card">
                <div>
                  <h4 className="font-medium text-sm">{type.name}</h4>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}