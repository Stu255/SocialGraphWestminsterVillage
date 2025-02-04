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
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3">
        <CardTitle className="text-base font-semibold">
          People
        </CardTitle>
        <FieldSettingsDialog graphId={graphId} />
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 space-y-2">
        <Button 
          className="w-full justify-start h-8 text-sm"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Person
        </Button>

        <Button 
          className="w-full justify-start h-8 text-sm"
          variant="outline"
          onClick={() => setShowListDialog(true)}
        >
          <Users className="h-4 w-4 mr-2" />
          See People
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