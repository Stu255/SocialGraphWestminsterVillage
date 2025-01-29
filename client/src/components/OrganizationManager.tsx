import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddOrganizationDialog } from "./AddOrganizationDialog";
import { OrganizationListDialog } from "./OrganizationListDialog";

interface OrganizationManagerProps {
  graphId: number;
}

export function OrganizationManager({ graphId }: OrganizationManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showListDialog, setShowListDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, graph_id: graphId }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to create organization");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", graphId] });
      setShowAddDialog(false);
      toast({
        title: "Success",
        description: "Organization added successfully",
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
        <CardTitle>Add Organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button 
          className="w-full" 
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Organization
        </Button>

        <Button 
          className="w-full"
          variant="outline"
          onClick={() => setShowListDialog(true)}
        >
          <Users className="h-4 w-4 mr-2" />
          See Organizations
        </Button>

        <AddOrganizationDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          graphId={graphId}
          mutation={mutation}
        />

        <OrganizationListDialog
          open={showListDialog}
          onOpenChange={setShowListDialog}
          graphId={graphId}
        />
      </CardContent>
    </Card>
  );
}