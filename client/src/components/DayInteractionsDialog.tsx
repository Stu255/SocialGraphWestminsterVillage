import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Mail, Phone, Calendar, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { NetworkGraph } from "./NetworkGraph";

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

const getInteractionIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'email':
      return Mail;
    case 'call':
      return Phone;
    case 'meeting':
      return Calendar;
    default:
      return MessageSquare;
  }
};

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

  const getIconStyles = (interactionDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(interactionDate);
    compareDate.setHours(0, 0, 0, 0);

    const isPast = compareDate < today;
    const isToday = compareDate.getTime() === today.getTime();
    const isFuture = compareDate > today;

    return {
      background: isPast ? 'bg-red-100' : isFuture ? 'bg-green-100' : 'bg-gray-100',
      border: isToday ? 'ring-2 ring-yellow-400' : '',
    };
  };

  const currentContacts = contacts?.filter(contact => 
    currentInteraction?.contactIds?.includes(contact.id)
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <div className="flex items-center gap-4">
            {currentInteraction && (
              <>
                <span className="text-lg">{new Date(date).toLocaleDateString()}</span>
                {(() => {
                  const Icon = getInteractionIcon(currentInteraction.type);
                  const styles = getIconStyles(currentInteraction.date);
                  return (
                    <div className={cn(
                      "p-2 rounded-full",
                      styles.background,
                      styles.border
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                  );
                })()}
              </>
            )}
          </div>
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

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                {currentInteraction.notes && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {currentInteraction.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-l pl-4">
                <div className="h-[300px] w-full">
                  <NetworkGraph
                    nodes={currentContacts.map(contact => ({
                      id: contact.id,
                      name: contact.name,
                    }))}
                    links={currentContacts.flatMap((contact, i) => 
                      currentContacts.slice(i + 1).map(target => ({
                        sourcePersonId: contact.id,
                        targetPersonId: target.id,
                        connectionType: 1,
                        graphId: graphId,
                        id: -1
                      }))
                    )}
                    filters={{}}
                    graphId={graphId}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}