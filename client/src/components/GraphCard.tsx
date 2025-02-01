import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

interface GraphCardProps {
  id: number;
  name: string;
  createdAt: string;
  modifiedAt: string;
  deleteAt?: string | null;
  onClick?: () => void;
}

export function GraphCard({ id, name, modifiedAt, deleteAt, onClick }: GraphCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(name);
  const [, setLocation] = useLocation();

  const renameGraphMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/graphs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error("Failed to rename network");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/graphs"] });
      setIsEditing(false);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/graphs"] });
      toast({
        title: "Delete Timer Started",
        description: "Network will be deleted in 48 hours",
      });
    },
  });

  const cancelDeleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/graphs/${id}/delete-timer`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to cancel delete timer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/graphs"] });
      toast({
        title: "Delete Cancelled",
        description: "Network delete timer has been cancelled",
      });
    },
  });

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newName !== name) {
      renameGraphMutation.mutate();
    } else {
      setIsEditing(false);
    }
  };

  const getTimeRemaining = () => {
    if (!deleteAt) return null;
    const remaining = new Date(deleteAt).getTime() - Date.now();
    if (remaining <= 0) return "Deleting soon...";
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const timeRemaining = deleteAt ? getTimeRemaining() : null;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Only navigate if the click wasn't on a button or input
    if (
      !target.closest('button') && 
      !target.closest('input') && 
      !isEditing && 
      onClick
    ) {
      onClick();
    }
  };

  return (
    <Card 
      className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <form onSubmit={handleRename} className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8"
                autoFocus
                onBlur={() => setIsEditing(false)}
              />
            </form>
          ) : (
            <>
              <h3 className="font-medium truncate">{name}</h3>
              <p className="text-sm text-muted-foreground">
                Modified {new Date(modifiedAt).toLocaleDateString()}
              </p>
              {timeRemaining && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-6 text-xs text-red-500 hover:text-red-600"
                  onClick={() => cancelDeleteMutation.mutate()}
                >
                  Delete in {timeRemaining} (click to cancel)
                </Button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(true)}
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
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => startDeleteTimerMutation.mutate()}
            disabled={!!deleteAt}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}