import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { FieldSettingsDialog } from "./FieldSettingsDialog";
import { ContactFormDialog } from "./ContactFormDialog";
import { ContactListDialog } from "./ContactListDialog";

interface NodeFormProps {
  graphId: number;
}

export function NodeForm({ graphId }: NodeFormProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showListDialog, setShowListDialog] = useState(false);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
        <CardTitle className="text-[0.875rem] font-semibold truncate">
          People
        </CardTitle>
        <FieldSettingsDialog graphId={graphId} />
      </CardHeader>
      <CardContent className="space-y-1.5 flex-1">
        <Button 
          className="w-full justify-start h-8"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
          <span className="text-[0.813rem]">Add Person</span>
        </Button>

        <Button 
          className="w-full justify-start h-8"
          variant="outline"
          onClick={() => setShowListDialog(true)}
        >
          <Users className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
          <span className="text-[0.813rem]">See People</span>
        </Button>

        <ContactFormDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          graphId={graphId}
        />

        <ContactListDialog
          open={showListDialog}
          onOpenChange={setShowListDialog}
          graphId={graphId}
        />
      </CardContent>
    </Card>
  );
}