import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";

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

  const renameGraphMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/graphs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          throw new Error(data.message || "Failed to rename network");
        } else {
          const text = await res.text();
          throw new Error("Failed to rename network. Please try again.");
        }
      }

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid server response");
      }

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
    onError: (error: Error) => {
      console.error("Rename error:", error);
      setNewName(name); // Reset to original name
      setIsEditing(false); // Exit edit mode
      toast({
        title: "Error",
        description: error.message || "Failed to rename network",
        variant: "destructive",
      });
    },
  });

  const updateModifiedAtMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/graphs/${id}/touch`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error("Failed to update last modified time");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/graphs"] });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newName.trim() !== name) {
      await renameGraphMutation.mutateAsync();
    } else {
      setIsEditing(false);
      setNewName(name);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      !target.closest('button') && 
      !target.closest('input') && 
      !isEditing && 
      onClick
    ) {
      updateModifiedAtMutation.mutate();
      onClick();
    }
  };

  const formatModifiedDate = (date: string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Never";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  const getTimeRemaining = () => {
    if (!deleteAt) return null;
    const remaining = new Date(deleteAt).getTime() - Date.now();
    if (remaining <= 0) return "Deleting soon...";
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const timeRemaining = deleteAt ? getTimeRemaining() : null;

  return (
    <Card 
      className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setNewName(name);
                  }
                }}
              />
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium truncate">{name}</h3>
                <p className="text-sm text-muted-foreground">
                  Modified {formatModifiedDate(modifiedAt)}
                </p>
              </div>
              {timeRemaining && (
                <button
                  className="text-xs text-red-500 hover:text-red-600 ml-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to cancel the deletion?')) {
                      cancelDeleteMutation.mutate();
                    }
                  }}
                >
                  {timeRemaining}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              if (isEditing) {
                handleSubmit(e);
              } else {
                setIsEditing(true);
              }
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              duplicateGraphMutation.mutate();
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              startDeleteTimerMutation.mutate();
            }}
            disabled={!!deleteAt}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}