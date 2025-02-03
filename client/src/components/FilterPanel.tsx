import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Organization</label>
          <Select
            value={filters.organization || "all"}
            onValueChange={(value) =>
              onFilterChange({ ...filters, organization: value === "all" ? null : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.name}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Your Relationship Type</label>
          <Select
            value={filters.userRelationshipType?.toString() || "all"}
            onValueChange={(value) =>
              onFilterChange({
                ...filters,
                userRelationshipType: value === "all" ? null : Number(value)
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select relationship type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Relationships</SelectItem>
              {USER_RELATIONSHIP_TYPES.map((type) => (
                <SelectItem key={type.id} value={type.id.toString()}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Connection Type</label>
          <Select
            value={filters.connectionType?.toString() || "all"}
            onValueChange={(value) =>
              onFilterChange({
                ...filters,
                connectionType: value === "all" ? null : Number(value)
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select connection type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Connections</SelectItem>
              {CONNECTION_TYPES.map((type) => (
                <SelectItem key={type.id} value={type.id.toString()}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}