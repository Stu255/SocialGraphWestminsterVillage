import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newPolitician: { id: number; name: string } | null;
}

interface RelationshipSelection {
  politicianId: number;
  type: string;
}

export function MultiStepRelationshipDialog({ open, onOpenChange, newPolitician }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPoliticians, setSelectedPoliticians] = useState<number[]>([]);
  const [relationships, setRelationships] = useState<RelationshipSelection[]>([]);

  const queryClient = useQueryClient();

  const { data: politicians = [] } = useQuery({
    queryKey: ["/api/politicians"],
  });

  const { data: relationshipTypes = [] } = useQuery({
    queryKey: ["/api/relationship-types"],
  });

  const createRelationshipMutation = useMutation({
    mutationFn: async (relationship: any) => {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(relationship),
      });
      if (!res.ok) throw new Error("Failed to create relationship");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships"] });
    },
  });

  const handleNext = () => {
    if (step === 1) {
      // Initialize relationships array with selected politicians
      setRelationships(
        selectedPoliticians.map(id => ({
          politicianId: id,
          type: "",
        }))
      );
      setStep(2);
    }
  };

  const handleFinish = async () => {
    // Create all relationships
    const promises = relationships.map(rel => {
      if (!newPolitician) return;
      return createRelationshipMutation.mutateAsync({
        sourcePoliticianId: newPolitician.id,
        targetPoliticianId: rel.politicianId,
        relationshipType: rel.type,
      });
    });

    await Promise.all(promises);
    setStep(1);
    setSelectedPoliticians([]);
    setRelationships([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    setStep(1);
    setSelectedPoliticians([]);
    setRelationships([]);
    onOpenChange(false);
  };

  if (!newPolitician) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {step === 1
              ? "Select Politicians"
              : "Define Relationships"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Select politicians to create relationships with."
              : "Choose relationship types for each selected politician."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {politicians
                .filter(p => p.id !== newPolitician.id)
                .map(politician => (
                  <div key={politician.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`p-${politician.id}`}
                      checked={selectedPoliticians.includes(politician.id)}
                      onCheckedChange={(checked) => {
                        setSelectedPoliticians(prev =>
                          checked
                            ? [...prev, politician.id]
                            : prev.filter(id => id !== politician.id)
                        );
                      }}
                    />
                    <Label htmlFor={`p-${politician.id}`}>{politician.name}</Label>
                  </div>
                ))}
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {relationships.map((rel, index) => {
                const politician = politicians.find(p => p.id === rel.politicianId);
                return (
                  <div key={rel.politicianId} className="space-y-2">
                    <Label>{politician?.name}</Label>
                    <Select
                      value={rel.type}
                      onValueChange={(value) => {
                        setRelationships(prev => {
                          const newRels = [...prev];
                          newRels[index] = { ...newRels[index], type: value };
                          return newRels;
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship type" />
                      </SelectTrigger>
                      <SelectContent position="popper" side="top" align="start">
                        {relationshipTypes.map((type: any) => (
                          <SelectItem key={type.id} value={type.name}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {step === 1 ? (
            <Button
              onClick={handleNext}
              disabled={selectedPoliticians.length === 0}
            >
              Next
            </Button>
          ) : (
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                onClick={handleFinish}
                disabled={relationships.some(r => !r.type)}
              >
                Create Relationships
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
