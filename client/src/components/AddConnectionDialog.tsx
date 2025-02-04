import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { ChevronLeft, ArrowUpDown, ChevronDown, ChevronUp, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { CONNECTION_TYPES, getConnectionNameById } from "./ConnectionManager";
import { useToast } from "@/hooks/use-toast";
import { getUserRelationshipNameById } from "./RelationshipTypeManager";

interface Person {
  id: number;
  name: string;
  organization: string;
  jobTitle: string;
  relationshipToYou: number;
}

interface Connection {
  id: number;
  sourcePersonId: number;
  targetPersonId: number;
  connectionType: number;
  graphId: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

type SortField = "name" | "organization" | "jobTitle" | "relationshipToYou";
type SortDirection = "asc" | "desc";

export function AddConnectionDialog({ open, onOpenChange, graphId }: Props) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    name: "",
    organization: "",
    jobTitle: "",
    relationshipToYou: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const itemsPerPage = 10;

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people", graphId],
    queryFn: async () => {
      console.log("Fetching people for connection dialog, graphId:", graphId);
      const res = await fetch(`/api/people?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch people");
      const data = await res.json();
      console.log("People data for connections:", data);
      return data;
    },
    enabled: !!graphId,
  });

  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: ["/api/connections", graphId],
    queryFn: async () => {
      console.log("Fetching connections for dialog, graphId:", graphId);
      const res = await fetch(`/api/connections?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch connections");
      const data = await res.json();
      console.log("Connections data for dialog:", data);
      return data;
    },
    enabled: !!graphId,
  });

  const updateConnection = useMutation({
    mutationFn: async ({ sourceId, targetId, connectionType }: {
      sourceId: number;
      targetId: number;
      connectionType: number;
    }) => {
      console.log("Updating connection in dialog:", {
        sourceId,
        targetId,
        connectionType,
        graphId,
      });

      const res = await fetch(`/api/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          graphId,
          connectionType,
          sourcePersonId: sourceId,
          targetPersonId: targetId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error("Connection update failed:", errorData);
        throw new Error(
          errorData?.error ||
            `Failed to update connection: ${res.status} ${res.statusText}`
        );
      }

      const data = await res.json();
      console.log("Connection update successful:", data);
      return data;
    },
    onSuccess: () => {
      console.log("Invalidating connections query after update");
      queryClient.invalidateQueries({ queryKey: ["/api/connections", graphId] });
      toast({ title: "Success", description: "Connection updated" });
    },
    onError: (error: any) => {
      console.error("Connection update mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update connection",
        variant: "destructive",
      });
    },
  });

  const getCurrentConnection = (targetPersonId: number) => {
    if (!selectedPerson) return 0;
    console.log(
      "Getting current connection for target",
      targetPersonId,
      "connections:",
      connections
    );
    const connection = connections.find(
      (c) =>
        (c.sourcePersonId === selectedPerson.id &&
          c.targetPersonId === targetPersonId) ||
        (c.sourcePersonId === targetPersonId &&
          c.targetPersonId === selectedPerson.id)
    );
    console.log("Found connection:", connection);
    return connection?.connectionType ?? 0;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };

  const filteredAndSortedPeople = people
    .filter((person) => person.id !== selectedPerson?.id)
    .filter((person) => {
      return (
        person.name.toLowerCase().includes(filters.name.toLowerCase()) &&
        (person.organization || "").toLowerCase().includes(filters.organization.toLowerCase()) &&
        (person.jobTitle || "").toLowerCase().includes(filters.jobTitle.toLowerCase()) &&
        (filters.relationshipToYou === "" ||
          getUserRelationshipNameById(person.relationshipToYou).toLowerCase().includes(filters.relationshipToYou.toLowerCase()))
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "organization") {
        comparison = (a.organization || "").localeCompare(b.organization || "");
      } else if (sortField === "jobTitle") {
        comparison = (a.jobTitle || "").localeCompare(b.jobTitle || "");
      } else if (sortField === "relationshipToYou") {
        comparison = a.relationshipToYou - b.relationshipToYou;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

  const totalPages = Math.ceil(filteredAndSortedPeople.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPeople = filteredAndSortedPeople.slice(startIndex, startIndex + itemsPerPage);

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
            <DialogTitle>
              {selectedPerson
                ? `Manage Connections for ${selectedPerson.name}`
                : "Select Contact"}
            </DialogTitle>
          </div>
          <DialogDescription>
            Manage connections between contacts in your network
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <input
              type="text"
              placeholder="Filter by name"
              className="px-2 py-1 border rounded"
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Filter by organization"
              className="px-2 py-1 border rounded"
              value={filters.organization}
              onChange={(e) =>
                setFilters({ ...filters, organization: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Filter by position"
              className="px-2 py-1 border rounded"
              value={filters.jobTitle}
              onChange={(e) => setFilters({ ...filters, jobTitle: e.target.value })}
            />
            <input
              type="text"
              placeholder="Filter by relationship"
              className="px-2 py-1 border rounded"
              value={filters.relationshipToYou}
              onChange={(e) =>
                setFilters({ ...filters, relationshipToYou: e.target.value })
              }
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead
                  onClick={() => handleSort("name")}
                  className="cursor-pointer"
                >
                  Name {getSortIcon("name")}
                </TableHead>
                <TableHead
                  onClick={() => handleSort("organization")}
                  className="cursor-pointer"
                >
                  Organization {getSortIcon("organization")}
                </TableHead>
                <TableHead
                  onClick={() => handleSort("jobTitle")}
                  className="cursor-pointer"
                >
                  Position {getSortIcon("jobTitle")}
                </TableHead>
                <TableHead
                  onClick={() => handleSort("relationshipToYou")}
                  className="cursor-pointer"
                >
                  Relationship to You {getSortIcon("relationshipToYou")}
                </TableHead>
                {selectedPerson && <TableHead>Connection Type</TableHead>}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPeople.map((person) => (
                <TableRow key={person.id} className="h-8 hover:bg-muted/50">
                  <TableCell className="py-1">{person.name}</TableCell>
                  <TableCell className="py-1">
                    {person.organization || "—"}
                  </TableCell>
                  <TableCell className="py-1">{person.jobTitle || "—"}</TableCell>
                  <TableCell className="py-1">
                    {getUserRelationshipNameById(person.relationshipToYou)}
                  </TableCell>
                  {selectedPerson && (
                    <TableCell className="py-1">
                      <Select
                        value={String(getCurrentConnection(person.id))}
                        onValueChange={(value) => {
                          const connectionType = parseInt(value, 10);
                          updateConnection.mutate({
                            sourceId: selectedPerson.id,
                            targetId: person.id,
                            connectionType,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {getConnectionNameById(getCurrentConnection(person.id))}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {CONNECTION_TYPES.map((type) => (
                            <SelectItem key={type.id} value={String(type.id)}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  <TableCell className="py-1">
                    {!selectedPerson && (
                      <Button
                        variant="ghost"
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

          <div className="flex items-center justify-between py-2">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              {startIndex + 1}-
              {Math.min(startIndex + itemsPerPage, filteredAndSortedPeople.length)}{" "}
              of {filteredAndSortedPeople.length}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <div className="text-sm">Page {currentPage} of {totalPages}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}