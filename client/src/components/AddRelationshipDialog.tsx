import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { ChevronLeft } from "lucide-react";
import { USER_RELATIONSHIP_TYPES } from "./RelationshipTypeManager";
import { useToast } from "@/hooks/use-toast";

interface Person {
  id: number;
  name: string;
  organization: string;
  jobTitle: string;
  userRelationshipType: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

export function AddRelationshipDialog({ open, onOpenChange, graphId }: Props) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people", graphId],
    enabled: !!graphId,
  });

  const updateUserRelationship = useMutation({
    mutationFn: async ({ personId, userRelationshipType }: { 
      personId: number, 
      userRelationshipType: number 
    }) => {
      console.log("Updating user relationship:", { personId, userRelationshipType });

      const response = await fetch(`/api/people/${personId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRelationshipType,
          graphId
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Server error:", error);
        throw new Error(`Failed to update relationship: ${error}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people", graphId] });
      toast({ title: "Success", description: "Relationship updated" });
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update relationship",
        variant: "destructive"
      });
    }
  });

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
              {selectedPerson ? `Manage Relationship with ${selectedPerson.name}` : "Select Person"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Position</TableHead>
              {selectedPerson && <TableHead>Your Relationship</TableHead>}
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people
              .filter(person => person.id !== selectedPerson?.id)
              .map((person) => (
                <TableRow key={person.id}>
                  <TableCell>{person.name}</TableCell>
                  <TableCell>{person.organization || "—"}</TableCell>
                  <TableCell>{person.jobTitle || "—"}</TableCell>
                  {selectedPerson && (
                    <TableCell>
                      <Select
                        value={String(person.userRelationshipType || 1)}
                        onValueChange={(value) => {
                          console.log("Selected new relationship value:", value);
                          updateUserRelationship.mutate({
                            personId: person.id,
                            userRelationshipType: Number(value)
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_RELATIONSHIP_TYPES.map((type) => (
                            <SelectItem key={type.id} value={String(type.id)}>
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
      </DialogContent>
    </Dialog>
  );
}