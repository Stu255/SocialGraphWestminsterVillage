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
import { RELATIONSHIP_TYPES } from "./RelationshipTypeManager";
import { useToast } from "@/hooks/use-toast";

interface Person {
  id: number;
  name: string;
  organization: string;
  jobTitle: string;
}

interface AddRelationshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

type SortField = "name" | "organization" | "jobTitle";
type SortDirection = "asc" | "desc";

export function AddRelationshipDialog({ open, onOpenChange, graphId }: AddRelationshipDialogProps) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people", graphId],
    enabled: !!graphId,
  });

  const mutation = useMutation({
    mutationFn: async ({ sourceId, targetId, relationshipType }: any) => {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePersonId: sourceId,
          targetPersonId: targetId,
          relationshipType,
          graphId,
        }),
      });
      if (!res.ok) throw new Error("Failed to create relationship");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", graphId] });
      toast({
        title: "Success",
        description: "Relationship created successfully",
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

  const sortedAndFilteredPeople = [...people]
    .filter(person =>
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const aValue = (a[sortField] || "").toLowerCase();
      const bValue = (b[sortField] || "").toLowerCase();
      return aValue.localeCompare(bValue) * direction;
    });

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
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
    } catch (error) {
      // Error is handled by mutation's onError
    }
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
          <Input
            placeholder="Search by name, organization, or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  Name {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort("organization")}
                >
                  Organization {sortField === "organization" && (sortDirection === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort("jobTitle")}
                >
                  Position {sortField === "jobTitle" && (sortDirection === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredPeople
                .filter(person => !selectedPerson || person.id !== selectedPerson.id)
                .map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>{person.name}</TableCell>
                    <TableCell>{person.organization}</TableCell>
                    <TableCell>{person.jobTitle}</TableCell>
                    <TableCell>
                      {selectedPerson ? (
                        <Select
                          onValueChange={(value) => handleRelationshipSelect(person, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {RELATIONSHIP_TYPES.map(type => (
                              <SelectItem key={type.id} value={type.name}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
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