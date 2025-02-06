import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { getUserRelationshipNameById } from "./RelationshipTypeManager";

interface PeopleSelectorProps {
  graphId: number;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  initialContactId?: number;
}

type SortConfig = {
  column: string | null;
  direction: "asc" | "desc" | null;
};

export function PeopleSelector({ graphId, selectedIds, onSelectionChange, initialContactId }: PeopleSelectorProps) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    direction: null
  });

  const { data: people = [] } = useQuery({
    queryKey: ["/api/people", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/people?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch people");
      return res.json();
    },
  });

  const handleSort = (column: string) => {
    setSortConfig(current => ({
      column,
      direction:
        current.column === column && current.direction === "asc"
          ? "desc"
          : "asc"
    }));
  };

  const handleFilter = (column: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const handleToggleAll = () => {
    if (selectedIds.length === people.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(people.map((p: any) => p.id));
    }
  };

  const filteredPeople = people.filter((person: any) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      const fieldValue = String(person[key] || "").toLowerCase();
      return fieldValue.includes(value.toLowerCase());
    });
  });

  const sortedPeople = [...filteredPeople].sort((a: any, b: any) => {
    if (!sortConfig.column || !sortConfig.direction) return 0;
    
    const aValue = String(a[sortConfig.column] || "").toLowerCase();
    const bValue = String(b[sortConfig.column] || "").toLowerCase();
    
    return sortConfig.direction === "asc"
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  });

  const renderColumnHeader = (column: string, label: string) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder={`Filter ${label}`}
          value={filters[column] || ""}
          onChange={(e) => handleFilter(column, e.target.value)}
          className="h-8"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => handleSort(column)}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectedIds.length === people.length}
                onCheckedChange={handleToggleAll}
              />
            </TableHead>
            <TableHead>{renderColumnHeader("name", "Name")}</TableHead>
            <TableHead>{renderColumnHeader("organization", "Organization")}</TableHead>
            <TableHead>{renderColumnHeader("jobTitle", "Job Title")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPeople.map((person: any) => (
            <TableRow key={person.id}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(person.id)}
                  onCheckedChange={(checked) => {
                    onSelectionChange(
                      checked
                        ? [...selectedIds, person.id]
                        : selectedIds.filter(id => id !== person.id)
                    );
                  }}
                />
              </TableCell>
              <TableCell className="font-medium">{person.name}</TableCell>
              <TableCell>{person.organization || "—"}</TableCell>
              <TableCell>{person.jobTitle || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
