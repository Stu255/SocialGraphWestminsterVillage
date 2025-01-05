import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

const parties = ["Conservative", "Labour", "Liberal Democrat", "SNP", "Other"] as const;
const relationshipTypes = ["SPAD", "Advisor", "Mentor", "Committee", "Department"] as const;

interface Committee {
  id: number;
  name: string;
}

interface Filters {
  party: string | null;
  committee: string | null;
  relationshipType: string | null;
}

interface FilterPanelProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export function FilterPanel({ filters, onFilterChange }: FilterPanelProps) {
  const { data: committees = [] } = useQuery<Committee[]>({
    queryKey: ["/api/committees"],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Party</label>
          <Select
            value={filters.party || ""}
            onValueChange={(value) =>
              onFilterChange({ ...filters, party: value || null })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select party" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Parties</SelectItem>
              {parties.map((party) => (
                <SelectItem key={party} value={party}>
                  {party}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Committee</label>
          <Select
            value={filters.committee || ""}
            onValueChange={(value) =>
              onFilterChange({ ...filters, committee: value || null })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select committee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Committees</SelectItem>
              {committees.map((committee) => (
                <SelectItem key={committee.id} value={committee.id.toString()}>
                  {committee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Relationship Type</label>
          <Select
            value={filters.relationshipType || ""}
            onValueChange={(value) =>
              onFilterChange({ ...filters, relationshipType: value || null })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              {relationshipTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}