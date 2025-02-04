import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterDialog } from "./FilterDialog";
import { useState } from "react";
import { USER_RELATIONSHIP_TYPES } from "./RelationshipTypeManager";
import { CONNECTION_TYPES } from "./ConnectionManager";

interface Organization {
  id: number;
  name: string;
  color: string;
}

interface Filters {
  organization: string | null;
  userRelationshipType: number | null;
  connectionType: number | null;
}

interface FilterPanelProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export function FilterPanel({ filters, onFilterChange }: FilterPanelProps) {
  const [openOrgDialog, setOpenOrgDialog] = useState(false);
  const [openRelDialog, setOpenRelDialog] = useState(false);
  const [openConnDialog, setOpenConnDialog] = useState(false);

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const handleOrganizationChange = (selectedIds: (string | number)[]) => {
    onFilterChange({
      ...filters,
      organization: selectedIds.length === 0 ? null : selectedIds[0] as string
    });
  };

  const handleRelationshipChange = (selectedIds: (string | number)[]) => {
    onFilterChange({
      ...filters,
      userRelationshipType: selectedIds.length === 0 ? null : selectedIds[0] as number
    });
  };

  const handleConnectionChange = (selectedIds: (string | number)[]) => {
    onFilterChange({
      ...filters,
      connectionType: selectedIds.length === 0 ? null : selectedIds[0] as number
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Organization</label>
          <div className="flex gap-2">
            <Button
              variant={filters.organization === null ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleOrganizationChange([])}
            >
              All
            </Button>
            <Button
              variant={filters.organization !== null ? "default" : "outline"}
              className="flex-1"
              onClick={() => setOpenOrgDialog(true)}
            >
              Filter
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Your Relationship Type</label>
          <div className="flex gap-2">
            <Button
              variant={filters.userRelationshipType === null ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleRelationshipChange([])}
            >
              All
            </Button>
            <Button
              variant={filters.userRelationshipType !== null ? "default" : "outline"}
              className="flex-1"
              onClick={() => setOpenRelDialog(true)}
            >
              Filter
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Connection Type</label>
          <div className="flex gap-2">
            <Button
              variant={filters.connectionType === null ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleConnectionChange([])}
            >
              All
            </Button>
            <Button
              variant={filters.connectionType !== null ? "default" : "outline"}
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
          items={organizations.map(org => ({ id: org.name, name: org.name }))}
          selectedItems={filters.organization ? [filters.organization] : []}
          onSelectedItemsChange={handleOrganizationChange}
        />

        <FilterDialog
          open={openRelDialog}
          onOpenChange={setOpenRelDialog}
          title="Filter Relationship Types"
          items={USER_RELATIONSHIP_TYPES.map(type => ({ id: type.id, name: type.name }))}
          selectedItems={filters.userRelationshipType ? [filters.userRelationshipType] : []}
          onSelectedItemsChange={handleRelationshipChange}
        />

        <FilterDialog
          open={openConnDialog}
          onOpenChange={setOpenConnDialog}
          title="Filter Connection Types"
          items={CONNECTION_TYPES.map(type => ({ id: type.id, name: type.name }))}
          selectedItems={filters.connectionType ? [filters.connectionType] : []}
          onSelectedItemsChange={handleConnectionChange}
        />
      </CardContent>
    </Card>
  );
}