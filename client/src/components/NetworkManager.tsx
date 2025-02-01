import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NetworkManagerProps {
  graphId: number;
  currentName: string;
}

export function NetworkManager({ graphId, currentName }: NetworkManagerProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(currentName);
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

  // Update countdown every second
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (deleteTimer) {
      interval = setInterval(() => {
        const countdown = formatCountdown(deleteTimer);
        if (countdown === "00:00:00") {
          // Trigger delete when timer reaches zero
          deleteGraphMutation.mutate(graphId);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [deleteTimer]);

  // Mutations
  const renameGraphMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/graphs/${graphId}`, {
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
      const res = await fetch(`/api/graphs/${graphId}/duplicate`, {
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
      const res = await fetch(`/api/graphs/${graphId}/delete-timer`, {
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
      const res = await fetch(`/api/graphs/${graphId}/delete-timer`, {
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

  const deleteGraphMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/graphs/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to delete network");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/graphs"] });
      toast({
        title: "Network Deleted",
        description: "Network has been permanently deleted",
      });
    },
  });

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Network Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isRenaming ? (
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => renameGraphMutation.mutate()}
              disabled={!newName.trim() || newName === currentName}
            >
              Save
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span>{currentName}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsRenaming(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => duplicateGraphMutation.mutate()}
            className="flex gap-2"
          >
            <Copy className="h-4 w-4" />
            Duplicate Network
          </Button>

          {deleteTimer ? (
            <Button
              variant="destructive"
              onClick={() => cancelDeleteTimerMutation.mutate()}
              className="text-red-500"
            >
              {formatCountdown(deleteTimer)}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => startDeleteTimerMutation.mutate()}
              className="flex gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Network
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
