import { NetworkGraph } from "@/components/NetworkGraph";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { FilterPanel } from "@/components/FilterPanel";
import { NodeForm } from "@/components/NodeForm";
import { OrganizationManager } from "@/components/OrganizationManager";
import { RelationshipTypeManager } from "@/components/RelationshipTypeManager";
import { ConnectionManager } from "@/components/ConnectionManager";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { Button } from "@/components/ui/button";
import { ChevronRight, Home } from "lucide-react";
import { NetworkManager } from "@/components/NetworkManager";
import { cn } from "@/lib/utils";

interface Props {
  params: {
    id: string;
  };
}

export default function GraphPage({ params }: Props) {
  const isMobile = useMobile();
  const [, setLocation] = useLocation();
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [filters, setFilters] = useState({
    organization: null as string | null,
    connectionType: null as number | null,
    userRelationshipType: null as number | null,
  });

  const graphId = parseInt(params.id);

  const { data: people } = useQuery({
    queryKey: ["/api/people", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/people?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch people");
      const data = await res.json();
      return data;
    },
  });

  const { data: connections } = useQuery({
    queryKey: ["/api/connections", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/connections?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch connections");
      const data = await res.json();
      return data;
    },
  });

  const { data: graph } = useQuery({
    queryKey: ["/api/graphs", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/graphs/${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch graph");
      const data = await res.json();
      return data;
    },
  });

  const handleNodeDeleted = () => {
    setSelectedNode(null);
  };

  const handleHomeClick = () => {
    setLocation("/");
  };

  const preparedNodes = (people || []).map((person: any) => ({
    ...person,
    relationshipToYou: person.relationshipToYou === undefined || person.relationshipToYou === null ? 1 : person.relationshipToYou
  }));

  const graphComponent = (
    <NetworkGraph
      nodes={preparedNodes}
      links={connections || []}
      filters={{
        affiliation: filters.organization,
        userRelationshipType: filters.userRelationshipType || undefined,
        connectionType: filters.connectionType || undefined
      }}
      onNodeSelect={setSelectedNode}
      graphId={graphId}
    />
  );

  if (isMobile) {
    return (
      <MobileLayout
        selectedNode={selectedNode}
        nodes={preparedNodes}
        relationships={connections || []}
        filters={filters}
        graphId={graphId}
        onFilterChange={setFilters}
        onNodeDeleted={handleNodeDeleted}
        onHomeClick={handleHomeClick}
      >
        {graphComponent}
      </MobileLayout>
    );
  }

  return (
    <div className="h-screen w-full bg-background overflow-hidden font-sans">
      <ResizablePanelGroup direction="horizontal">
        {/* Left Sidebar */}
        <ResizablePanel 
          defaultSize={20} 
          minSize={15} 
          maxSize={25}
          className="border-r min-w-[250px] max-w-[350px]"
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleHomeClick}
                className="h-8 w-8"
              >
                <Home className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-6">
                {graph && (
                  <div className="space-y-2">
                    <h2 className="text-sm font-medium text-foreground/70 truncate">Network</h2>
                    <NetworkManager graphId={graphId} currentName={graph.name} />
                  </div>
                )}
                <div className="space-y-2">
                  <h2 className="text-sm font-medium text-foreground/70 truncate">Add Person</h2>
                  <NodeForm graphId={graphId} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-sm font-medium text-foreground/70 truncate">Organizations</h2>
                  <OrganizationManager graphId={graphId} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-sm font-medium text-foreground/70 truncate">Connections</h2>
                  <ConnectionManager graphId={graphId} title="Connections" />
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Main Content */}
        <ResizablePanel 
          defaultSize={showRightSidebar ? 60 : 80}
          className="relative"
        >
          {graphComponent}
        </ResizablePanel>

        <ResizableHandle />

        {/* Right Sidebar */}
        <ResizablePanel 
          defaultSize={showRightSidebar ? 20 : 0}
          minSize={0}
          maxSize={25}
          className={cn(
            "transition-all duration-300 min-w-[250px] max-w-[350px]",
            !showRightSidebar && "!w-0 !min-w-0 !max-w-0 !p-0"
          )}
        >
          <div className="relative h-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowRightSidebar(!showRightSidebar)}
              className={cn(
                "absolute -left-3 top-3 z-10 rounded-full bg-background shadow-md border",
                !showRightSidebar && "rotate-180"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Recall tab - always present behind the sidebar */}
            <div 
              onClick={() => setShowRightSidebar(true)}
              className="absolute -left-8 top-1/2 -translate-y-1/2 rotate-90 bg-background border rounded-t-lg px-2 py-1.5 cursor-pointer shadow-md hover:bg-accent transition-colors"
            >
              <span className="text-xs font-medium text-muted-foreground">Analysis & Filters</span>
            </div>

            <div className={cn(
              "h-full transition-all duration-300 border-l",
              !showRightSidebar ? "opacity-0 pointer-events-none w-0" : "opacity-100 w-full"
            )}>
              <div className="h-full overflow-y-auto">
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-sm font-medium text-foreground/70 truncate">Filters</h2>
                    <FilterPanel filters={filters} onFilterChange={setFilters} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-sm font-medium text-foreground/70 truncate">Analysis</h2>
                    <AnalysisPanel
                      selectedNode={selectedNode}
                      graphId={graphId}
                      onNodeDeleted={handleNodeDeleted}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}