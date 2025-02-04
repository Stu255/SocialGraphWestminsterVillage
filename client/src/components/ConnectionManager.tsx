import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";
import { AddConnectionDialog } from "./AddConnectionDialog";

// Define connection types (for edge lines)
export const CONNECTION_TYPES = [
  { id: 5, name: "Allied", icon: "strong", description: "Life long trusted connections with allied interests" },
  { id: 4, name: "Trusted", icon: "regular", description: "Long lasting / permanent trusted connections" },
  { id: 3, name: "Close", icon: "standard-line", description: "Contact on a weekly/daily basis" },
  { id: 2, name: "Familiar", icon: "thin-line", description: "Contact on a monthly/weekly basis" },
  { id: 1, name: "Acquainted", icon: "thin-dashed-line", description: "Contact on a quarterly/monthly basis" },
  { id: 0, name: "None", icon: "no-line", description: "No meaningful connection" }
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
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-1 flex-shrink-0">
        <CardTitle className="text-base font-semibold">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 flex-1">
        <Button 
          className="w-full justify-start h-7"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
          <span className="text-xs truncate">Add Connection</span>
        </Button>

        <Button 
          className="w-full justify-start h-7"
          variant="outline"
          onClick={() => setShowListDialog(true)}
        >
          <Users className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
          <span className="text-xs truncate">Connection Types</span>
        </Button>

        <AddConnectionDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          graphId={graphId}
        />

        {showListDialog && (
          <div className="space-y-1">
            {CONNECTION_TYPES.map((type) => (
              <div key={type.id} className="flex items-center justify-between p-1.5 rounded-lg border bg-card">
                <div className="min-w-0">
                  <h4 className="text-xs font-medium truncate">
                    {type.name}
                  </h4>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {type.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}