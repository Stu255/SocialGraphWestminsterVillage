import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { FieldSettingsDialog } from "./FieldSettingsDialog";
import { AddContactDialog } from "./AddContactDialog";
import { useToast } from "@/hooks/use-toast";

interface NodeFormProps {
  graphId: number;
}

export function NodeForm({ graphId }: NodeFormProps) {
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const standardFields = ["name", "jobTitle", "organisation", "notes", "graphId"];
      const customFieldValues: Record<string, string> = {};

      Object.keys(values).forEach(key => {
        if (!standardFields.includes(key)) {
          customFieldValues[key] = values[key];
          delete values[key];
        }
      });

      if (Object.keys(customFieldValues).length > 0) {
        try {
          const existingNotes = values.notes ? JSON.parse(values.notes) : {};
          values.notes = JSON.stringify({
            ...existingNotes,
            customFields: customFieldValues,
            text: existingNotes.text || ""
          });
        } catch {
          values.notes = JSON.stringify({
            customFields: customFieldValues,
            text: values.notes || ""
          });
        }
      }

      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to create contact");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/people", graphId] });
      setShowDialog(false);
      toast({
        title: "Success",
        description: "Contact added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Add Contact</CardTitle>
        <FieldSettingsDialog graphId={graphId} />
      </CardHeader>
      <CardContent>
        <Button 
          className="w-full" 
          onClick={() => setShowDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>

        <AddContactDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          graphId={graphId}
          mutation={mutation}
        />
      </CardContent>
    </Card>
  );
}