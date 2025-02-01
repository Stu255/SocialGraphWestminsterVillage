import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GraphCardProps {
  id: number;
  name: string;
  createdAt: string;
}

export function GraphCard({ id, name, createdAt }: GraphCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(name);
  const [deleteTimer, setDeleteTimer] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Format countdown timer
  const formatCountdown = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    
    if (diff <= 0) return "00:00:00";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Mutations
  const renameGraphMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/graphs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error("Failed to rename network");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/graphs"] });
      setIsRenaming(false);
      toast({
        title: "Success",
        description: "Network renamed successfully",
      });
    },
  });

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
    onSuccess: (data) => {
      setDeleteTimer(data.deleteAt);
      queryClient.invalidateQueries({ queryKey: ["/api/graphs"] });
      toast({
        title: "Delete Timer Started",
        description: "Network will be deleted in 48 hours",
      });
    },
  });

  const cancelDeleteTimerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/graphs/${id}/delete-timer`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to cancel delete timer");
      return res.json();
    },
    onSuccess: () => {
      setDeleteTimer(null);
      queryClient.invalidateQueries({ queryKey: ["/api/graphs"] });
      toast({
        title: "Delete Timer Cancelled",
        description: "Network deletion cancelled",
      });
    },
  });

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        {isRenaming ? (
          <div className="flex gap-2 flex-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => renameGraphMutation.mutate()}
              disabled={!newName.trim() || newName === name}
            >
              Save
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1">
              <h3 className="font-medium">{name}</h3>
              <p className="text-sm text-muted-foreground">
                Created {new Date(createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsRenaming(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => duplicateGraphMutation.mutate()}
              >
                <Copy className="h-4 w-4" />
              </Button>
              {deleteTimer ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelDeleteTimerMutation.mutate()}
                  className="text-red-500"
                >
                  {formatCountdown(deleteTimer)}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => startDeleteTimerMutation.mutate()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
