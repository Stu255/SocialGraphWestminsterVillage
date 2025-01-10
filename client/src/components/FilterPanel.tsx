import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Affiliation {
  id: number;
  name: string;
  color: string;
}

interface RelationshipType {
  id: number;
  name: string;
}

interface Filters {
  affiliation: string | null;
  relationshipType: string | null;
}

interface FilterPanelProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export function FilterPanel({ filters, onFilterChange }: FilterPanelProps) {
  const { data: affiliations = [] } = useQuery<Affiliation[]>({
    queryKey: ["/api/affiliations"],
  });

  const { data: relationshipTypes = [] } = useQuery<RelationshipType[]>({
    queryKey: ["/api/relationship-types"],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Affiliation</label>
          <Select
            value={filters.affiliation || "all"}
            onValueChange={(value) =>
              onFilterChange({ ...filters, affiliation: value === "all" ? null : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select affiliation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Affiliations</SelectItem>
              {affiliations.map((affiliation) => (
                <SelectItem key={affiliation.id} value={affiliation.name}>
                  {affiliation.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Relationship Type</label>
          <Select
            value={filters.relationshipType || "all"}
            onValueChange={(value) =>
              onFilterChange({ ...filters, relationshipType: value === "all" ? null : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {relationshipTypes.map((type) => (
                <SelectItem key={type.id} value={type.name}>
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