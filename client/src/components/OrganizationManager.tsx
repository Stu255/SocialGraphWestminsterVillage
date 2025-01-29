import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddOrganizationDialog } from "./AddOrganizationDialog";

interface OrganizationManagerProps {
  graphId: number;
}

export function OrganizationManager({ graphId }: OrganizationManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
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
      setShowDialog(false);
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
      <CardContent>
        <Button 
          className="w-full" 
          onClick={() => setShowDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Organization
        </Button>

        <AddOrganizationDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          graphId={graphId}
          mutation={mutation}
        />
      </CardContent>
    </Card>
  );
}
