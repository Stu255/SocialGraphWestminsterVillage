import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

export function RelationshipTypeManager() {
  const queryClient = useQueryClient();
  const [newType, setNewType] = useState("");

  const { data: relationshipTypes = [] } = useQuery({
    queryKey: ["/api/relationship-types"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/relationship-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create relationship type");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-types"] });
      setNewType("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/relationship-types/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete relationship type");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-types"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newType.trim()) {
      createMutation.mutate(newType.trim());
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relationship Types</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <Input
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            placeholder="New relationship type..."
          />
          <Button type="submit">Add</Button>
        </form>

        <div className="space-y-2">
          {relationshipTypes.map((type: any) => (
            <div key={type.id} className="flex items-center justify-between">
              <span>{type.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(type.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
