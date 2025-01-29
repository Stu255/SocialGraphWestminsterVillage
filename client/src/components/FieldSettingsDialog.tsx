import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FieldSettingsDialogProps {
  graphId: number;
}

interface FieldPreferences {
  order: string[];
  hidden: string[];
}

const DEFAULT_FIELDS = [
  { id: "name", label: "Full Name", required: true },
  { id: "jobTitle", label: "Job Title", required: false },
  { id: "organization", label: "Organisation Name", required: false },
  { id: "lastContact", label: "Last Contact Made", required: false },
  { id: "officeNumber", label: "Office Number", required: false },
  { id: "mobileNumber", label: "Mobile Number", required: false },
  { id: "email1", label: "Email Address 1", required: false },
  { id: "email2", label: "Email Address 2", required: false },
  { id: "linkedin", label: "LinkedIn", required: false },
  { id: "twitter", label: "Twitter", required: false },
  { id: "notes", label: "Notes", required: false }
];

export function FieldSettingsDialog({ graphId }: FieldSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preferences = { order: DEFAULT_FIELDS.map(f => f.id), hidden: [] } } = useQuery<FieldPreferences>({
    queryKey: ["/api/field-preferences", graphId],
    enabled: open && !!graphId
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: FieldPreferences) => {
      const res = await fetch(`/api/field-preferences/${graphId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPreferences),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-preferences", graphId] });
      toast({
        title: "Success",
        description: "Field preferences updated successfully",
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

  const toggleFieldVisibility = (fieldId: string) => {
    const newHidden = preferences.hidden.includes(fieldId)
      ? preferences.hidden.filter(id => id !== fieldId)
      : [...preferences.hidden, fieldId];

    updatePreferencesMutation.mutate({
      ...preferences,
      hidden: newHidden
    });
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = preferences.order.indexOf(fieldId);
    if (direction === 'up' && currentIndex > 0) {
      const newOrder = [...preferences.order];
      [newOrder[currentIndex], newOrder[currentIndex - 1]] = 
      [newOrder[currentIndex - 1], newOrder[currentIndex]];
      updatePreferencesMutation.mutate({
        ...preferences,
        order: newOrder
      });
    } else if (direction === 'down' && currentIndex < preferences.order.length - 1) {
      const newOrder = [...preferences.order];
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = 
      [newOrder[currentIndex + 1], newOrder[currentIndex]];
      updatePreferencesMutation.mutate({
        ...preferences,
        order: newOrder
      });
    }
  };

  // Sort fields according to the order preference
  const orderedFields = [...DEFAULT_FIELDS].sort((a, b) => {
    const aIndex = preferences.order.indexOf(a.id);
    const bIndex = preferences.order.indexOf(b.id);
    return aIndex - bIndex;
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Field Settings</DialogTitle>
          <DialogDescription>
            Configure which fields to show and their order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {orderedFields.map((field) => (
            <div key={field.id} className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <p className="font-medium">{field.label}</p>
                {field.required && (
                  <p className="text-sm text-muted-foreground">Required</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!field.required && (
                  <Switch
                    checked={!preferences.hidden.includes(field.id)}
                    onCheckedChange={() => toggleFieldVisibility(field.id)}
                  />
                )}

                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveField(field.id, 'up')}
                    disabled={preferences.order.indexOf(field.id) === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveField(field.id, 'down')}
                    disabled={preferences.order.indexOf(field.id) === preferences.order.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}