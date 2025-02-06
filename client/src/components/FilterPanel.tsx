import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterDialog } from "./FilterDialog";
import { useState } from "react";
import { USER_RELATIONSHIP_TYPES } from "./RelationshipTypeManager";
import { CONNECTION_TYPES } from "./ConnectionManager";
import { Building2, GitBranch } from "lucide-react";

interface Organization {
  id: number;
  name: string;
  color: string;
}

interface Filters {
  organization: string[];
  userRelationshipType: number[];
  connectionType: number[];
}

interface FilterPanelProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  graphId: number;
}

export function FilterPanel({ filters, onFilterChange, graphId }: FilterPanelProps) {
  const [openOrgDialog, setOpenOrgDialog] = useState(false);
  const [openRelDialog, setOpenRelDialog] = useState(false);
  const [openConnDialog, setOpenConnDialog] = useState(false);

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch organizations");
      return res.json();
    },
    enabled: !!graphId,
  });

  // Add "No Organisation Recorded" to organizations list
  const orgItems = [
    { id: "__none__", name: "No Organisation Recorded" },
    ...organizations.map(org => ({ id: org.name, name: org.name }))
  ];

  const handleOrganizationChange = (selectedIds: (string | number)[]) => {
    onFilterChange({
      ...filters,
      organization: selectedIds.map(id => String(id))
    });
  };

  const handleRelationshipChange = (selectedIds: (string | number)[]) => {
    onFilterChange({
      ...filters,
      userRelationshipType: selectedIds.map(id => Number(id))
    });
  };

  const handleConnectionChange = (selectedIds: (string | number)[]) => {
    onFilterChange({
      ...filters,
      connectionType: selectedIds.map(id => Number(id))
    });
  };

  const sortedRelationshipTypes = [...USER_RELATIONSHIP_TYPES].sort((a, b) => b.id - a.id);
  const sortedConnectionTypes = [...CONNECTION_TYPES].sort((a, b) => b.id - a.id);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Organization</label>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filters.organization.length === 0 ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleOrganizationChange([])}
            >
              All
            </Button>
            <Button
              variant={filters.organization.length > 0 ? "default" : "outline"}
              className="flex-1"
              onClick={() => setOpenOrgDialog(true)}
            >
              Filter
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Your Relationship Type</label>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filters.userRelationshipType.length === 0 ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleRelationshipChange([])}
            >
              All
            </Button>
            <Button
              variant={filters.userRelationshipType.length > 0 ? "default" : "outline"}
              className="flex-1"
              onClick={() => setOpenRelDialog(true)}
            >
              Filter
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Connection Type</label>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filters.connectionType.length === 0 ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleConnectionChange([])}
            >
              All
            </Button>
            <Button
              variant={filters.connectionType.length > 0 ? "default" : "outline"}
              className="flex-1"
              onClick={() => setOpenConnDialog(true)}
            >
              Filter
            </Button>
          </div>
        </div>

        <FilterDialog
          open={openOrgDialog}
          onOpenChange={setOpenOrgDialog}
          title="Filter Organizations"
          items={orgItems}
          selectedItems={filters.organization}
          onSelectedItemsChange={handleOrganizationChange}
          enableSorting={true}
        />

        <FilterDialog
          open={openRelDialog}
          onOpenChange={setOpenRelDialog}
          title="Filter Relationship Types"
          items={sortedRelationshipTypes.map(type => ({ id: type.id, name: type.name }))}
          selectedItems={filters.userRelationshipType}
          onSelectedItemsChange={handleRelationshipChange}
          enableSorting={false}
        />

        <FilterDialog
          open={openConnDialog}
          onOpenChange={setOpenConnDialog}
          title="Filter Connection Types"
          items={sortedConnectionTypes.map(type => ({ id: type.id, name: type.name }))}
          selectedItems={filters.connectionType}
          onSelectedItemsChange={handleConnectionChange}
          enableSorting={false}
        />
      </CardContent>
    </Card>
  );
}