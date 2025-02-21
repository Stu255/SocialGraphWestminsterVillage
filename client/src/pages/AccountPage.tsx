import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LogOut } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { GraphCard } from "@/components/GraphCard";

interface SocialGraph {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  modifiedAt: string;
  deleteAt: string | null;
}

export default function AccountPage() {
  const [newGraphName, setNewGraphName] = useState("");
  const [, setLocation] = useLocation();
  const { logout, user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: graphs = [], isError, error } = useQuery<SocialGraph[]>({
    queryKey: ["/api/graphs"],
    select: (data) => {
      return [...data].sort((a, b) => {
        const dateA = new Date(a.modifiedAt).getTime();
        const dateB = new Date(b.modifiedAt).getTime();
        return dateB - dateA;
      });
    }
  });

  // Handle error state using useEffect
  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to fetch graphs",
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  const createGraphMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/graphs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create graph");
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
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGraphName.trim()) {
      createGraphMutation.mutate(newGraphName.trim());
    }
  };

  return (
    <div className="min-h-screen w-full bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Welcome, {user?.username}</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Social Graphs</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
              <Input
                value={newGraphName}
                onChange={(e) => setNewGraphName(e.target.value)}
                placeholder="New graph name..."
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={createGraphMutation.isPending || !newGraphName.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Graph
              </Button>
            </form>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {graphs.map((graph) => (
                <GraphCard
                  key={graph.id}
                  id={graph.id}
                  name={graph.name}
                  createdAt={graph.createdAt}
                  modifiedAt={graph.modifiedAt}
                  deleteAt={graph.deleteAt}
                  onClick={() => setLocation(`/graph/${graph.id}`)}
                />
              ))}
              {graphs.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-8">
                  No graphs yet. Create your first graph above!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}