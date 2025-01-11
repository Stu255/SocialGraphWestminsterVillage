import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, X, Check, ArrowLeft } from "lucide-react";
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
    affiliation: "",
    currentRole: "",
    notes: "",
  });

  // Initialize edit values when node is selected
  useEffect(() => {
    if (selectedNode) {
      setEditedValues({
        affiliation: selectedNode.affiliation,
        currentRole: selectedNode.currentRole || "",
        notes: selectedNode.notes || "",
      });
    }
  }, [selectedNode]);

  const { data: centrality } = useQuery({
    queryKey: ["/api/analysis/centrality"],
    enabled: !!nodes.length,
  });

  // Display top 10 people by centrality
  const topPeople = centrality
    ?.sort((a: any, b: any) => b.centrality - a.centrality)
    .slice(0, 10) || [];

  const updatePersonMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch(`/api/people/${selectedNode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to update person");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setIsEditing(false);
    },
  });

  const deletePersonMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/people/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to delete person");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
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
    updatePersonMutation.mutate(editedValues);
  };

  if (!selectedNode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select a node to view detailed analysis
            </p>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Top 10 Most Connected People</h3>
              {topPeople.map((person: any, index: number) => (
                <div key={person.id} className="flex justify-between items-center text-sm">
                  <span>{index + 1}. {person.name}</span>
                  <span className="text-muted-foreground">{person.centrality.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nodeMetrics = centrality?.find((c: any) => c.id === selectedNode.id);
  const nodeRelationships = relationships.filter(r => 
    r.sourcePersonId === selectedNode.id || 
    r.targetPersonId === selectedNode.id
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onNodeDeleted}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{selectedNode.name}</h2>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Profile</CardTitle>
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
                      <AlertDialogTitle>Delete Person</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {selectedNode.name} and all their relationships.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deletePersonMutation.mutate(selectedNode.id)}
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
                  <label className="text-sm font-medium">Affiliation</label>
                  <Select
                    value={editedValues.affiliation}
                    onValueChange={(value) => setEditedValues(prev => ({ ...prev, affiliation: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select affiliation" />
                    </SelectTrigger>
                    <SelectContent>
                      {affiliations.map((affiliation: any) => (
                        <SelectItem key={affiliation.id} value={affiliation.name}>
                          {affiliation.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <p><strong>Affiliation:</strong> {selectedNode.affiliation}</p>
                <p><strong>Current Role:</strong> {selectedNode.currentRole}</p>
                <div>
                  <p className="font-medium mb-2">Notes:</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedNode.notes || "No notes added yet."}
                  </p>
                </div>
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
            <p><strong>Centrality Score:</strong> {nodeMetrics?.centrality.toFixed(3) || 0}</p>
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
                n.id === (rel.sourcePersonId === selectedNode.id ? 
                  rel.targetPersonId : 
                  rel.sourcePersonId
                )
              );

              return (
                <div key={rel.id} className="flex items-center justify-between">
                  <span>
                    {rel.sourcePersonId === selectedNode.id ? "→" : "←"} {otherNode?.name} 
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

const affiliations = []; // This needs to be populated from your data source