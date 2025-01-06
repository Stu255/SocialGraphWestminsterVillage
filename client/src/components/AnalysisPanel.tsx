import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
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

interface AnalysisPanelProps {
  selectedNode: any;
  nodes: any[];
  relationships: any[];
  onNodeDeleted?: () => void;
}

export function AnalysisPanel({ selectedNode, nodes, relationships, onNodeDeleted }: AnalysisPanelProps) {
  const queryClient = useQueryClient();

  const { data: centrality } = useQuery({
    queryKey: ["/api/analysis/centrality"],
    enabled: !!nodes.length,
  });

  const deletePoliticianMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/politicians/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to delete politician");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/politicians"] });
      queryClient.invalidateQueries({ queryKey: ["/api/relationships"] });
      if (onNodeDeleted) onNodeDeleted();
    },
  });

  const deleteRelationshipMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/relationships/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to delete relationship");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships"] });
    },
  });

  if (!selectedNode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a node to view detailed analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  const nodeMetrics = centrality?.find((c: any) => c.id === selectedNode.id);
  const nodeRelationships = relationships.filter(r => 
    r.sourcePoliticianId === selectedNode.id || 
    r.targetPoliticianId === selectedNode.id
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{selectedNode.name}</CardTitle>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Politician</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {selectedNode.name} and all their relationships.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deletePoliticianMutation.mutate(selectedNode.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Party:</strong> {selectedNode.party}</p>
            <p><strong>Constituency:</strong> {selectedNode.constituency}</p>
            <p><strong>Current Role:</strong> {selectedNode.currentRole}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Network Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Centrality Score:</strong> {nodeMetrics?.centrality || 0}</p>
            <p><strong>Direct Connections:</strong> {nodeRelationships.length}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {nodeRelationships.map(rel => {
              const otherNode = nodes.find(n => 
                n.id === (rel.sourcePoliticianId === selectedNode.id ? 
                  rel.targetPoliticianId : 
                  rel.sourcePoliticianId
                )
              );

              return (
                <div key={rel.id} className="flex items-center justify-between">
                  <span>
                    {rel.sourcePoliticianId === selectedNode.id ? "→" : "←"} {otherNode?.name} 
                    ({rel.relationshipType})
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRelationshipMutation.mutate(rel.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}