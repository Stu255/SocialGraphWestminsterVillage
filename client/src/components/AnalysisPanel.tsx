import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
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

const parties = ["Conservative", "Labour", "Liberal Democrat", "SNP", "Other"] as const;

interface AnalysisPanelProps {
  selectedNode: any;
  nodes: any[];
  relationships: any[];
  onNodeDeleted?: () => void;
}

export function AnalysisPanel({ selectedNode, nodes, relationships, onNodeDeleted }: AnalysisPanelProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState({
    party: "",
    constituency: "",
    currentRole: "",
    notes: "",
  });

  // Initialize edit values when node is selected
  useEffect(() => {
    if (selectedNode) {
      setEditedValues({
        party: selectedNode.party,
        constituency: selectedNode.constituency,
        currentRole: selectedNode.currentRole || "",
        notes: selectedNode.notes || "",
      });
    }
  }, [selectedNode]);

  const { data: centrality } = useQuery({
    queryKey: ["/api/analysis/centrality"],
    enabled: !!nodes.length,
  });

  const updatePoliticianMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch(`/api/politicians/${selectedNode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to update politician");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/politicians"] });
      setIsEditing(false);
    },
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

  const handleSave = () => {
    updatePoliticianMutation.mutate(editedValues);
  };

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
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  onClick={handleSave}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
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
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Party</label>
                  <Select
                    value={editedValues.party}
                    onValueChange={(value) => setEditedValues(prev => ({ ...prev, party: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select party" />
                    </SelectTrigger>
                    <SelectContent>
                      {parties.map((party) => (
                        <SelectItem key={party} value={party}>
                          {party}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Constituency</label>
                  <Input
                    value={editedValues.constituency}
                    onChange={(e) => setEditedValues(prev => ({ ...prev, constituency: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Role</label>
                  <Input
                    value={editedValues.currentRole}
                    onChange={(e) => setEditedValues(prev => ({ ...prev, currentRole: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={editedValues.notes}
                    onChange={(e) => setEditedValues(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add notes about this person..."
                    className="min-h-[100px]"
                  />
                </div>
              </>
            ) : (
              <>
                <p><strong>Party:</strong> {selectedNode.party}</p>
                <p><strong>Constituency:</strong> {selectedNode.constituency}</p>
                <p><strong>Current Role:</strong> {selectedNode.currentRole}</p>
                {selectedNode.notes && (
                  <div>
                    <p className="font-medium mb-2">Notes:</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedNode.notes}</p>
                  </div>
                )}
              </>
            )}
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