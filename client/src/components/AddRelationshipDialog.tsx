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
import { ChevronLeft, ArrowUpDown } from "lucide-react";
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
import { RELATIONSHIP_TYPES } from "./RelationshipTypeManager";
import { useToast } from "@/hooks/use-toast";

interface Person {
  id: number;
  name: string;
  organization: string;
  jobTitle: string;
  relationshipToYou?: string;
}

interface AddRelationshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

type SortField = "name" | "organization" | "jobTitle" | "relationshipToYou";
type SortDirection = "asc" | "desc";
type FilterValues = Record<string, string>;
type SortConfig = {
  column: string | null;
  direction: SortDirection | null;
};

const getRelationshipStrength = (relationshipName: string | undefined) => {
  if (!relationshipName) return -1;
  const type = RELATIONSHIP_TYPES.find(t => t.name === relationshipName);
  return type ? type.id : -1;
};

export function AddRelationshipDialog({ open, onOpenChange, graphId }: AddRelationshipDialogProps) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, direction: null });
  const [filters, setFilters] = useState<FilterValues>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people", graphId],
    enabled: !!graphId,
  });

  const mutation = useMutation({
    mutationFn: async ({ sourceId, targetId, relationshipType }: any) => {
      if (relationshipType === "none") {
        // Delete relationships in both directions
        const promises = [
          fetch(`/api/relationships?sourcePersonId=${sourceId}&targetPersonId=${targetId}&graphId=${graphId}`, {
            method: "DELETE",
          }),
          fetch(`/api/relationships?sourcePersonId=${targetId}&targetPersonId=${sourceId}&graphId=${graphId}`, {
            method: "DELETE",
          })
        ];

        const results = await Promise.all(promises);
        const failed = results.some(res => !res.ok);
        if (failed) throw new Error("Failed to remove relationships");
        return { message: "Relationships removed" };
      } else {
        // Create relationships in both directions
        const payload = {
          relationshipType,
          graphId,
        };

        const promises = [
          fetch("/api/relationships", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              sourcePersonId: sourceId,
              targetPersonId: targetId,
            }),
          }),
          fetch("/api/relationships", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              sourcePersonId: targetId,
              targetPersonId: sourceId,
            }),
          })
        ];

        const results = await Promise.all(promises);
        const failed = results.some(res => !res.ok);
        if (failed) throw new Error("Failed to update relationships");

        // Return the first result as the response
        return results[0].json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", graphId] });
      toast({
        title: "Success",
        description: "Relationships updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredPeople = people.filter((person) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      const fieldValue = person[key as keyof Person]?.toLowerCase() || "";
      return fieldValue.includes(value.toLowerCase());
    });
  });

  const sortedPeople = [...filteredPeople].sort((a, b) => {
    if (!sortConfig.column || !sortConfig.direction) {
      return a.name.localeCompare(b.name);
    }

    if (sortConfig.column === "relationshipToYou") {
      const aStrength = getRelationshipStrength(a.relationshipToYou);
      const bStrength = getRelationshipStrength(b.relationshipToYou);
      return sortConfig.direction === "asc" 
        ? aStrength - bStrength 
        : bStrength - aStrength;
    }

    const aValue = (a[sortConfig.column as keyof Person] || "").toLowerCase();
    const bValue = (b[sortConfig.column as keyof Person] || "").toLowerCase();

    return sortConfig.direction === "asc"
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
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

  const handleConnect = (person: Person) => {
    setSelectedPerson(person);
  };

  const handleRelationshipSelect = async (targetPerson: Person, relationshipType: string) => {
    if (!selectedPerson) return;

    try {
      await mutation.mutateAsync({
        sourceId: selectedPerson.id,
        targetId: targetPerson.id,
        relationshipType,
      });

      // Update the local state to reflect the change for both parties
      targetPerson.relationshipToYou = relationshipType === "none" ? undefined : relationshipType;
      const selectedPersonInList = people.find(p => p.id === selectedPerson.id);
      if (selectedPersonInList) {
        selectedPersonInList.relationshipToYou = relationshipType === "none" ? undefined : relationshipType;
      }
    } catch (error) {
      // Error is handled by mutation's onError
    }
  };

  const renderColumnHeader = (column: string, label: string) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder={label}
            value={filters[column] || ""}
            onChange={(e) => handleFilter(column, e.target.value)}
            className="h-8"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
            onClick={() => handleSort(column)}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

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
                {selectedPerson ? selectedPerson.name : "Relationships"}
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
                  <TableHead>
                    {renderColumnHeader("relationshipToYou", "Relationship")}
                  </TableHead>
                )}
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPeople
                .filter(person => !selectedPerson || person.id !== selectedPerson.id)
                .map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>{person.name}</TableCell>
                    <TableCell>{person.organization || "—"}</TableCell>
                    <TableCell>{person.jobTitle || "—"}</TableCell>
                    {selectedPerson && (
                      <TableCell>
                        <Select
                          onValueChange={(value) => handleRelationshipSelect(person, value)}
                          value={person.relationshipToYou || "none"}
                        >
                          <SelectTrigger>
                            <SelectValue defaultValue="none" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {RELATIONSHIP_TYPES.map(type => (
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
                          onClick={() => handleConnect(person)}
                        >
                          Connect
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