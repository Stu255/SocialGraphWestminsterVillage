import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PeopleSelector } from "./PeopleSelector";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Mail, MessageSquare, Phone, Users, Calendar } from "lucide-react";

interface InteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date?: string;
  graphId: number;
  initialContactId?: number;
}

export function InteractionDialog({ open, onOpenChange, date, graphId, initialContactId }: InteractionDialogProps) {
  const [type, setType] = useState<string>("email");
  const [notes, setNotes] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<number[]>(
    initialContactId ? [initialContactId] : []
  );
  const [activeTab, setActiveTab] = useState("details");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: {
      type: string;
      notes: string;
      date: string;
      contactIds: number[];
      graphId: number;
    }) => {
      try {
        console.log("Sending interaction data:", values);
        const res = await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Interaction creation error response:", errorText);

          // Try to parse error as JSON first
          try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || "Failed to create interaction");
          } catch (parseError) {
            // If it's not JSON (e.g., HTML), throw a generic error
            throw new Error("Server error occurred while creating interaction. Please try again.");
          }
        }

        const responseText = await res.text();
        if (!responseText) {
          return null; // Handle empty response
        }

        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse response:", responseText);
          throw new Error("Invalid response from server");
        }
      } catch (error) {
        console.error("Interaction creation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people", graphId] });
      onOpenChange(false);
      setType("email");
      setNotes("");
      setSelectedContacts(initialContactId ? [initialContactId] : []);
      setActiveTab("details");
      toast({
        title: "Success",
        description: "Interaction added successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create interaction",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one contact",
        variant: "destructive",
      });
      return;
    }

    if (!type) {
      toast({
        title: "Error",
        description: "Please select an interaction type",
        variant: "destructive",
      });
      return;
    }

    try {
      const interactionData = {
        type,
        notes,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        contactIds: selectedContacts,
        graphId
      };

      console.log("Submitting interaction:", interactionData);
      await mutation.mutateAsync(interactionData);
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Record Interaction</DialogTitle>
          <DialogDescription>
            {date 
              ? `Record an interaction for ${new Date(date).toLocaleDateString()}`
              : "Record a new interaction"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type of Interaction</label>
                <ToggleGroup type="single" value={type} onValueChange={val => val && setType(val)}>
                  <ToggleGroupItem value="email" aria-label="Email">
                    <Mail className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="message" aria-label="Message">
                    <MessageSquare className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="call" aria-label="Call">
                    <Phone className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="meeting" aria-label="Meeting">
                    <Users className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="event" aria-label="Event">
                    <Calendar className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add detailed notes about the interaction..."
                  className="min-h-[200px]"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="people">
            <PeopleSelector
              graphId={graphId}
              selectedIds={selectedContacts}
              onSelectionChange={setSelectedContacts}
              initialContactId={initialContactId}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Interaction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}