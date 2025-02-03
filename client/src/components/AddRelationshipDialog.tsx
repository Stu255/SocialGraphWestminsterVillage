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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people", graphId]
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["/api/connections", graphId]
  });

  const updateConnection = useMutation({
    mutationFn: async ({ sourceId, targetId, connectionType }: { 
      sourceId: number, 
      targetId: number, 
      connectionType: string 
    }) => {
      // Direct mapping from name to ID
      const typeId = CONNECTION_TYPES.find(t => t.name === connectionType)?.id ?? 0;
      console.log("Updating connection:", { sourceId, targetId, connectionType, typeId });

      const existingConnection = connections.find(c => 
        (c.sourcePersonId === sourceId && c.targetPersonId === targetId) ||
        (c.targetPersonId === sourceId && c.sourcePersonId === targetId)
      );
      console.log("Existing connection:", existingConnection);

      const endpoint = existingConnection 
        ? `/api/connections/${existingConnection.id}`
        : "/api/connections";
      const method = existingConnection ? "PUT" : "POST";

      console.log(`Making ${method} request to ${endpoint}`);
      const payload = {
        graphId,
        connectionType: typeId,
        sourcePersonId: sourceId,
        targetPersonId: targetId
      };
      console.log("Request payload:", payload);

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Server error:", error);
        throw new Error(`Failed to update connection: ${error}`);
      }

      const result = await response.json();
      console.log("Server response:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Mutation succeeded:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/connections", graphId] });
      toast({ title: "Success", description: "Connection updated" });
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update connection",
        variant: "destructive"
      });
    }
  });

  const getCurrentConnection = (targetPersonId: number) => {
    const connection = connections.find(c => 
      (c.sourcePersonId === selectedPerson?.id && c.targetPersonId === targetPersonId) ||
      (c.targetPersonId === selectedPerson?.id && c.sourcePersonId === targetPersonId)
    );
    console.log("Getting current connection for target", targetPersonId, ":", connection);

    const connectionType = CONNECTION_TYPES.find(t => t.id === connection?.connectionType);
    console.log("Found connection type:", connectionType);

    return connectionType?.name || "None";
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
            <DialogTitle>
              {selectedPerson ? `Manage Connections for ${selectedPerson.name}` : "Select Person"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Position</TableHead>
              {selectedPerson && <TableHead>Connection</TableHead>}
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
                        value={getCurrentConnection(person.id)}
                        onValueChange={(value) => {
                          console.log("Selected new connection value:", value);
                          updateConnection.mutate({
                            sourceId: selectedPerson.id,
                            targetId: person.id,
                            connectionType: value
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
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
      </DialogContent>
    </Dialog>
  );
}