import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CONNECTION_TYPES } from "./RelationshipTypeManager";
import { useToast } from "@/hooks/use-toast";

interface Person {
  id: number;
  name: string;
  organization: string;
  jobTitle: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

export function AddConnectionDialog({ open, onOpenChange, graphId }: Props) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    column: string | null;
    direction: "asc" | "desc" | null;
  }>({
    column: null,
    direction: null,
  });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch people and their relationships
  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people", graphId],
    enabled: !!graphId,
  });

  const { data: relationships = [] } = useQuery({
    queryKey: ["/api/relationships", graphId],
    enabled: !!graphId,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/organizations", graphId],
    enabled: !!graphId,
  });

  const organizationColors = new Map(
    organizations.map((org: any) => [org.name, org.brandColor])
  );

  const getOrganizationColor = (organizationName: string) => 
    organizationColors.get(organizationName) || "hsl(var(--primary))";

  const mutation = useMutation({
    mutationFn: async ({
      sourceId,
      targetId,
      connectionType,
    }: {
      sourceId: number;
      targetId: number;
      connectionType: string;
    }) => {
      // Find existing relationship
      const existingRelationship = relationships.find(
        (r) =>
          (r.sourcePersonId === sourceId && r.targetPersonId === targetId) ||
          (r.targetPersonId === sourceId && r.sourcePersonId === targetId)
      );

      // Handle relationship removal
      if (connectionType === "none") {
        if (existingRelationship) {
          const res = await fetch(`/api/relationships/${existingRelationship.id}?graphId=${graphId}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || "Failed to remove relationship");
          }
        }
        return null;
      }

      // Find connection type ID
      const connectionTypeObj = CONNECTION_TYPES.find((t) => t.name === connectionType);
      if (!connectionTypeObj) throw new Error("Invalid connection type");

      const payload = {
        relationshipType: connectionTypeObj.id,
        graphId,
      };

      // Update or create relationship
      if (existingRelationship) {
        const res = await fetch(`/api/relationships/${existingRelationship.id}?graphId=${graphId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to update relationship");
        }
        return res.json();
      }

      // Create new relationship
      const res = await fetch(`/api/relationships?graphId=${graphId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePersonId: sourceId,
          targetPersonId: targetId,
          ...payload,
        }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to create relationship");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", graphId] });
      toast({
        title: "Success",
        description: "Connection updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getCurrentConnectionType = (targetPersonId: number): string => {
    if (!selectedPerson) return "none";

    const relationship = relationships.find(
      (r) =>
        (r.sourcePersonId === selectedPerson.id && r.targetPersonId === targetPersonId) ||
        (r.targetPersonId === selectedPerson.id && r.sourcePersonId === targetPersonId)
    );

    if (!relationship) return "none";

    const connectionType = CONNECTION_TYPES.find(
      (t) => t.id === relationship.relationshipType
    );
    return connectionType?.name || "none";
  };

  const handleConnectionSelect = (targetPerson: Person, connectionType: string) => {
    if (!selectedPerson) return;

    mutation.mutate({
      sourceId: selectedPerson.id,
      targetId: targetPerson.id,
      connectionType,
    });
  };

  const filteredPeople = people.filter((person) => {
    if (selectedPerson && person.id === selectedPerson.id) return false;

    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;

      if (key === "connectionType") {
        const currentType = getCurrentConnectionType(person.id);
        return value === "none"
          ? currentType === "none"
          : currentType === value;
      }

      const fieldValue = String(person[key as keyof Person] || "").toLowerCase();
      return fieldValue.includes(value.toLowerCase());
    });
  });

  const sortedPeople = [...filteredPeople].sort((a, b) => {
    if (!sortConfig.column || !sortConfig.direction) return 0;

    if (sortConfig.column === "connectionType") {
      const aType = getCurrentConnectionType(a.id);
      const bType = getCurrentConnectionType(b.id);
      return sortConfig.direction === "asc"
        ? aType.localeCompare(bType)
        : bType.localeCompare(aType);
    }

    const aValue = String(a[sortConfig.column as keyof Person] || "");
    const bValue = String(b[sortConfig.column as keyof Person] || "");
    return sortConfig.direction === "asc"
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  });

  const handleSort = (column: string) => {
    setSortConfig((current) => ({
      column,
      direction:
        current.column === column && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleFilter = (column: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
  };

  const renderColumnHeader = (column: string, label: string) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder={`Filter ${label.toLowerCase()}...`}
          value={filters[column] || ""}
          onChange={(e) => handleFilter(column, e.target.value)}
          className="h-8"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => handleSort(column)}
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {selectedPerson && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedPerson(null)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle>
                {selectedPerson
                  ? `Manage Connections for ${selectedPerson.name}`
                  : "Add Connections"}
              </DialogTitle>
              {selectedPerson && (
                <DialogDescription>
                  {selectedPerson.jobTitle} at {selectedPerson.organization}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  {renderColumnHeader("name", "Name")}
                </TableHead>
                <TableHead>
                  {renderColumnHeader("organization", "Organization")}
                </TableHead>
                <TableHead>
                  {renderColumnHeader("jobTitle", "Position")}
                </TableHead>
                {selectedPerson && (
                  <TableHead className="w-[150px]">
                    {renderColumnHeader("connectionType", "Connection")}
                  </TableHead>
                )}
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPeople.map((person) => (
                <TableRow key={person.id}>
                  <TableCell>{person.name}</TableCell>
                  <TableCell>{person.organization || "—"}</TableCell>
                  <TableCell>{person.jobTitle || "—"}</TableCell>
                  {selectedPerson && (
                    <TableCell>
                      <Select
                        value={getCurrentConnectionType(person.id)}
                        onValueChange={(value) =>
                          handleConnectionSelect(person, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {CONNECTION_TYPES.map((type) => (
                            <SelectItem key={type.id} value={type.name}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  <TableCell>
                    {!selectedPerson && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPerson(person)}
                      >
                        Manage
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}