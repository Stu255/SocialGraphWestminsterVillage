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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>People</CardTitle>
        <FieldSettingsDialog graphId={graphId} />
      </CardHeader>
      <CardContent className="space-y-2">
        <Button 
          className="w-full" 
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Person
        </Button>

        <Button 
          className="w-full"
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