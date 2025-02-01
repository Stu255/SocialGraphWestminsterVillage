import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface GraphCardProps {
  id: number;
  name: string;
  createdAt: string;
  modifiedAt: string;
  deleteAt?: string | null;
  onClick?: () => void;
}

export function GraphCard({ id, name, modifiedAt, deleteAt, onClick }: GraphCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(name);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate and update countdown timer
  useEffect(() => {
    if (!deleteAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const deleteTime = new Date(deleteAt).getTime();
      const diff = deleteTime - now;

      if (diff <= 0) {
        setTimeRemaining("00:00:00");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deleteAt]);

  const startDeletionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/graphs/${id}/delete`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error("Failed to start deletion timer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/graphs"] });
      toast({
        title: "Deletion Timer Started",
        description: "The graph will be deleted in 48 hours",
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

  const renameGraphMutation = useMutation({
    mutationFn: async (newName: string) => {
      const res = await fetch(`/api/graphs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error("Failed to rename graph");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/graphs"] });
      toast({
        title: "Success",
        description: "Graph renamed successfully",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim() && displayName !== name) {
      renameGraphMutation.mutate(displayName.trim());
      setIsEditing(false);
    } else {
      setDisplayName(name);
      setIsEditing(false);
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
      onClick();
    }
  };

  const formatModifiedDate = (date: string | null | undefined) => {
    // If no date is provided, use creation date as fallback
    if (!date) {
      return "Created";
    }

    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  return (
    <Card
      className={`p-4 ${deleteAt ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-secondary/50'} transition-colors cursor-pointer`}
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-8"
                autoFocus
                onBlur={handleSubmit}
              />
            </form>
          ) : (
            <div className={deleteAt ? 'text-red-600' : ''}>
              <h3 className="font-medium truncate">{displayName}</h3>
              <p className="text-sm text-muted-foreground">
                Modified {formatModifiedDate(modifiedAt)}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={!!deleteAt}
              >
                <Trash2 className={`h-4 w-4 ${deleteAt ? 'text-red-500' : ''}`} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Network</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this network? This action will start a 48-hour deletion timer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => startDeletionMutation.mutate()}>
                  Start Deletion Timer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {deleteAt && timeRemaining && (
        <div className="mt-2 text-sm font-medium text-red-500 text-center">
          Time until deletion: {timeRemaining}
        </div>
      )}
    </Card>
  );
}