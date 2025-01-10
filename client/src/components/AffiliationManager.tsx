import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function AffiliationManager() {
  const queryClient = useQueryClient();
  const [newAffiliation, setNewAffiliation] = useState("");
  const [selectedColor, setSelectedColor] = useState("#808080");
  const [editingAffiliation, setEditingAffiliation] = useState<{ id: number; name: string; color: string } | null>(null);

  const { data: affiliations = [] } = useQuery({
    queryKey: ["/api/affiliations"],
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const res = await fetch("/api/affiliations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) throw new Error("Failed to create affiliation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliations"] });
      setNewAffiliation("");
      setSelectedColor("#808080");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, color }: { id: number; color: string }) => {
      const res = await fetch(`/api/affiliations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      });
      if (!res.ok) throw new Error("Failed to update affiliation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliations"] });
      setEditingAffiliation(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/affiliations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete affiliation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliations"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAffiliation.trim()) {
      createMutation.mutate({ name: newAffiliation.trim(), color: selectedColor });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Affiliations</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
            <Input
              value={newAffiliation}
              onChange={(e) => setNewAffiliation(e.target.value)}
              placeholder="New affiliation..."
              className="flex-1"
            />
            <Input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-12 p-1 h-10"
            />
            <Button type="submit">Add</Button>
          </form>

          <div className="space-y-2">
            {affiliations.map((affiliation: any) => (
              <div key={affiliation.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: affiliation.color }}
                  />
                  <span>{affiliation.name}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingAffiliation(affiliation)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(affiliation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!editingAffiliation}
        onOpenChange={(open) => !open && setEditingAffiliation(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingAffiliation?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Color</label>
            <Input
              type="color"
              value={editingAffiliation?.color}
              onChange={(e) =>
                setEditingAffiliation(prev =>
                  prev ? { ...prev, color: e.target.value } : null
                )
              }
              className="w-full h-10 mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (editingAffiliation) {
                  updateMutation.mutate({
                    id: editingAffiliation.id,
                    color: editingAffiliation.color,
                  });
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
