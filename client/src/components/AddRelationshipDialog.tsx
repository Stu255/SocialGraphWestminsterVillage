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
import { CONNECTION_TYPES, getConnectionIdByName } from "./RelationshipTypeManager";
import { useToast } from "@/hooks/use-toast";

interface Person {
  id: number;
  name: string;
  organization: string;
  jobTitle: string;
  relationshipToYou?: string;
}

interface AddConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

type SortField = "name" | "organization" | "jobTitle";
type SortDirection = "asc" | "desc";
type FilterValues = Record<string, string>;
type SortConfig = {
  column: string | null;
  direction: SortDirection | null;
};

export function AddConnectionDialog({ open, onOpenChange, graphId }: AddConnectionDialogProps) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, direction: null });
  const [filters, setFilters] = useState<FilterValues>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people", graphId],
    enabled: !!graphId,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/organizations", graphId],
    enabled: !!graphId,
  });

  const organizationColors = new Map(
    organizations.map((org: any) => [org.name, org.brandColor])
  );

  const mutation = useMutation({
    mutationFn: async ({ sourceId, targetId, connectionType }: any) => {
      if (connectionType === "none") {
        const res = await fetch(`/api/relationships?sourcePersonId=${sourceId}&targetPersonId=${targetId}&graphId=${graphId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Delete relationship error response:", errorText);
          throw new Error(errorText || "Failed to remove connection");
        }

        return { message: "Connection removed" };
      } else {
        // Convert the connection type name to its numeric value
        const relationshipType = getConnectionIdByName(connectionType);
        console.log(`Converting connection type ${connectionType} to numeric value:`, relationshipType);

        const payload = {
          sourcePersonId: sourceId,
          targetPersonId: targetId,
          relationshipType,
          graphId,
        };

        console.log("Sending relationship payload:", payload);

        const res = await fetch("/api/relationships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          let errorMessage;

          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json();
            errorMessage = errorData.error;
          } else {
            const errorText = await res.text();
            console.error("Server error response:", errorText);
            errorMessage = `Server Error: ${res.status} ${res.statusText}`;
          }

          throw new Error(errorMessage || "Failed to create connection");
        }

        const data = await res.json();
        console.log("Relationship created successfully:", data);
        return data;
      }
    },
    onSuccess: (data) => {
      console.log("Mutation succeeded:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", graphId] });
      toast({
        title: "Success",
        description: "Connection updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConnectionSelect = async (targetPerson: Person, connectionType: string) => {
    if (!selectedPerson) return;

    try {
      await mutation.mutateAsync({
        sourceId: selectedPerson.id,
        targetId: targetPerson.id,
        connectionType,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/relationships", graphId] });
    } catch (error) {
      // Error is handled by mutation's onError
    }
  };

  const getOrganizationColor = (organizationName: string) => {
    return organizationColors.get(organizationName) || "hsl(var(--primary))";
  };

  const filteredPeople = people.filter((person) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      const fieldValue = String(person[key as keyof Person] || "").toLowerCase();
      return fieldValue.includes(value.toLowerCase());
    });
  });

  const sortedPeople = [...filteredPeople].sort((a, b) => {
    if (!sortConfig.column || !sortConfig.direction) {
      return a.name.localeCompare(b.name);
    }

    const aValue = String(a[sortConfig.column as keyof Person] || "").toLowerCase();
    const bValue = String(b[sortConfig.column as keyof Person] || "").toLowerCase();

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
                {selectedPerson ? `Manage Connections for ${selectedPerson.name}` : "Add Connections"}
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
                    <div className="pl-2">Connection Type</div>
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
                          onValueChange={(value) => handleConnectionSelect(person, value)}
                          defaultValue="none"
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {CONNECTION_TYPES.map(type => (
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