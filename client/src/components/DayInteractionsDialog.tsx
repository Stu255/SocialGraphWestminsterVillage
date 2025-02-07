import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface Contact {
  id: number;
  name: string;
}

interface Interaction {
  id: number;
  type: string;
  notes: string | null;
  date: string;
  contactIds?: number[];
}

interface DayInteractionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interactions: Interaction[];
  date: string;
  graphId: number;
}

export function DayInteractionsDialog({ 
  open, 
  onOpenChange, 
  interactions, 
  date,
  graphId
}: DayInteractionsDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: contacts } = useQuery({
    queryKey: ["/api/people", graphId],
    queryFn: async () => {
      const response = await fetch(`/api/people?graphId=${graphId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }
      return response.json() as Promise<Contact[]>;
    },
    enabled: open,
  });

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(interactions.length - 1, prev + 1));
  };

  const currentInteraction = interactions[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Interactions on {new Date(date).toLocaleDateString()}
          </DialogTitle>
        </DialogHeader>

        {currentInteraction && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} of {interactions.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  disabled={currentIndex === interactions.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Type</span>
                  <span className="capitalize">{currentInteraction.type}</span>
                </div>
                {currentInteraction.notes && (
                  <div className="space-y-2">
                    <span className="font-medium">Notes</span>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {currentInteraction.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-l pl-4">
                <span className="font-medium">People Involved</span>
                <div className="space-y-1">
                  {contacts?.filter(contact => 
                    currentInteraction.contactIds?.includes(contact.id)
                  ).map(contact => (
                    <div 
                      key={contact.id}
                      className="text-sm p-2 rounded-md bg-muted"
                    >
                      {contact.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}