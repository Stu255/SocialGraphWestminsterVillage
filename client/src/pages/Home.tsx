import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { GraphCard } from "@/components/GraphCard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Graph {
  id: number;
  name: string;
  createdAt: string;
  modifiedAt: string;
  deleteAt: string | null;
}

export default function Home() {
  const [newGraphName, setNewGraphName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: graphs = [] } = useQuery<Graph[]>({
    queryKey: ["/api/graphs"],
    queryFn: async () => {
      const res = await fetch("/api/graphs");
      if (!res.ok) throw new Error("Failed to fetch graphs");
      return res.json();
    },
  });

  const createGraphMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/graphs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGraphName }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ 
          error: `HTTP error! status: ${res.status}` 
        }));
        throw new Error(errorData.error || "Failed to create graph");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/graphs"] });
      setNewGraphName("");
      toast({
        title: "Success",
        description: "Graph created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create graph",
        variant: "destructive",
      });
    },
  });

  const handleCreateGraph = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGraphName.trim()) return;
    createGraphMutation.mutate();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Your Social Graphs</h1>

      <form onSubmit={handleCreateGraph} className="mb-8">
        <div className="flex gap-2">
          <Input
            placeholder="New graph name..."
            value={newGraphName}
            onChange={(e) => setNewGraphName(e.target.value)}
          />
          <Button type="submit" disabled={!newGraphName.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Graph
          </Button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {graphs.map((graph) => (
          <GraphCard
            key={graph.id}
            id={graph.id}
            name={graph.name}
            createdAt={graph.createdAt}
            modifiedAt={graph.modifiedAt}
            deleteAt={graph.deleteAt}
          />
        ))}
      </div>
    </div>
  );
}