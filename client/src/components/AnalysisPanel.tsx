import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { calculateCentrality } from "@/lib/graphUtils";

interface AnalysisPanelProps {
  selectedNode: any;
  nodes: any[];
  relationships: any[];
}

export function AnalysisPanel({ selectedNode, nodes, relationships }: AnalysisPanelProps) {
  const { data: centrality } = useQuery({
    queryKey: ["/api/analysis/centrality"],
    enabled: !!nodes.length,
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{selectedNode.name}</CardTitle>
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
            <p><strong>Direct Connections:</strong> {
              relationships.filter(r => 
                r.sourcePoliticianId === selectedNode.id || 
                r.targetPoliticianId === selectedNode.id
              ).length
            }</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
