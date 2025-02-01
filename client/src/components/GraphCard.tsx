import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface GraphCardProps {
  id: number;
  name: string;
  createdAt: string;
}

export function GraphCard({ id, name, createdAt }: GraphCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const duplicateGraphMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/graphs/${id}/duplicate`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error("Failed to duplicate network");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/graphs"] });
      toast({
        title: "Success",
        description: "Network duplicated successfully",
      });
    },
  });

  const startDeleteTimerMutation = useMutation({
    mutationFn: async () => {
      const deleteTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const res = await fetch(`/api/graphs/${id}/delete-timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAt: deleteTime }),
      });
      if (!res.ok) throw new Error("Failed to start delete timer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/graphs"] });
      toast({
        title: "Delete Timer Started",
        description: "Network will be deleted in 48 hours",
      });
    },
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{name}</h3>
          <p className="text-sm text-muted-foreground">
            Created {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => duplicateGraphMutation.mutate()}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => startDeleteTimerMutation.mutate()}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}