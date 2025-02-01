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
  const [displayName, setDisplayName] = useState(name);

  const renameGraphMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/graphs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to save changes");
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
    onError: () => {
      setDisplayName(name);
      setIsEditing(false);
      toast({
        title: "Error",
        description: "Failed to rename network. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim() && displayName.trim() !== name) {
      renameGraphMutation.mutate();
    } else {
      setIsEditing(false);
      setDisplayName(name);
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
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setDisplayName(name);
                  }
                }}
                onBlur={() => {
                  if (displayName.trim() === '') {
                    setDisplayName(name);
                  }
                  setIsEditing(false);
                }}
              />
            </form>
          ) : (
            <div>
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
              if (window.confirm('Are you sure you want to delete this network? This action will start a 48-hour deletion timer.')) {
                // Handle delete
              }
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