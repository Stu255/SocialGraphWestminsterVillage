import { useState } from "react";
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
import { Settings, ArrowUp, ArrowDown, Save, Cog } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

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

interface FieldSettingsDialogProps {
  graphId: number;
}

export function FieldSettingsDialog({ graphId }: FieldSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [fieldOrder, setFieldOrder] = useState(DEFAULT_FIELDS.map(f => f.id));
  const [hiddenFields, setHiddenFields] = useState<string[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldLabels, setFieldLabels] = useState(
    Object.fromEntries(DEFAULT_FIELDS.map(f => [f.id, f.label]))
  );
  const [tempLabel, setTempLabel] = useState("");

  const toggleFieldVisibility = (fieldId: string) => {
    setHiddenFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = fieldOrder.indexOf(fieldId);
    if (direction === 'up' && currentIndex > 0) {
      const newOrder = [...fieldOrder];
      [newOrder[currentIndex], newOrder[currentIndex - 1]] = 
      [newOrder[currentIndex - 1], newOrder[currentIndex]];
      setFieldOrder(newOrder);
    } else if (direction === 'down' && currentIndex < fieldOrder.length - 1) {
      const newOrder = [...fieldOrder];
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = 
      [newOrder[currentIndex + 1], newOrder[currentIndex]];
      setFieldOrder(newOrder);
    }
  };

  const startEditing = (fieldId: string) => {
    setEditingField(fieldId);
    setTempLabel(fieldLabels[fieldId]);
  };

  const saveFieldLabel = (fieldId: string) => {
    if (tempLabel.trim()) {
      setFieldLabels(prev => ({
        ...prev,
        [fieldId]: tempLabel.trim()
      }));
    }
    setEditingField(null);
    setTempLabel("");
  };

  // Sort fields according to the order
  const orderedFields = [...DEFAULT_FIELDS].sort((a, b) => {
    const aIndex = fieldOrder.indexOf(a.id);
    const bIndex = fieldOrder.indexOf(b.id);
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

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {orderedFields.map((field) => (
              <div key={field.id} className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  {editingField === field.id ? (
                    <Input
                      value={tempLabel}
                      onChange={(e) => setTempLabel(e.target.value)}
                      className="w-full"
                      autoFocus
                    />
                  ) : (
                    <p className="font-medium">{fieldLabels[field.id]}</p>
                  )}
                  {field.required && (
                    <p className="text-sm text-muted-foreground">Required</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!field.required && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          if (editingField === field.id) {
                            saveFieldLabel(field.id);
                          } else {
                            startEditing(field.id);
                          }
                        }}
                      >
                        {editingField === field.id ? (
                          <Save className="h-4 w-4" />
                        ) : (
                          <Cog className="h-4 w-4" />
                        )}
                      </Button>
                      <Switch
                        checked={!hiddenFields.includes(field.id)}
                        onCheckedChange={() => toggleFieldVisibility(field.id)}
                      />
                    </>
                  )}

                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveField(field.id, 'up')}
                      disabled={fieldOrder.indexOf(field.id) === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveField(field.id, 'down')}
                      disabled={fieldOrder.indexOf(field.id) === fieldOrder.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}