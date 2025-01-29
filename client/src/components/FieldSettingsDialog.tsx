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
import { Input } from "@/components/ui/input";
import { Settings, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface FieldSettingsDialogProps {
  graphId: number;
}

interface CustomField {
  id: number;
  fieldName: string;
  fieldType: string;
  isRequired: boolean;
}

const DEFAULT_FIELDS = [
  { fieldName: "name", fieldType: "text", isRequired: true, isDefault: true },
  { fieldName: "role", fieldType: "text", isRequired: false, isDefault: true },
  { fieldName: "organisation", fieldType: "text", isRequired: false, isDefault: true },
  { fieldName: "email", fieldType: "email", isRequired: false, isDefault: true },
  { fieldName: "phone", fieldType: "tel", isRequired: false, isDefault: true },
  { fieldName: "notes", fieldType: "textarea", isRequired: false, isDefault: true }
];

export function FieldSettingsDialog({ graphId }: FieldSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [newField, setNewField] = useState({ fieldName: "", fieldType: "text" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customFields = [] } = useQuery<CustomField[]>({
    queryKey: ["/api/custom-fields", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/custom-fields?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch custom fields");
      return res.json();
    },
  });

  const createFieldMutation = useMutation({
    mutationFn: async (field: { fieldName: string; fieldType: string; isRequired: boolean }) => {
      const res = await fetch("/api/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...field, graphId }),
      });
      if (!res.ok) throw new Error("Failed to create field");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields", graphId] });
      setNewField({ fieldName: "", fieldType: "text" });
      toast({
        title: "Success",
        description: "Field added successfully",
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

  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: number) => {
      const res = await fetch(`/api/custom-fields/${fieldId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete field");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields", graphId] });
      toast({
        title: "Success",
        description: "Field deleted successfully",
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

  const handleAddField = () => {
    if (!newField.fieldName.trim()) {
      toast({
        title: "Error",
        description: "Field name is required",
        variant: "destructive",
      });
      return;
    }

    // Check if field name already exists
    const allFieldNames = [...DEFAULT_FIELDS, ...customFields].map(f => f.fieldName.toLowerCase());
    if (allFieldNames.includes(newField.fieldName.toLowerCase())) {
      toast({
        title: "Error",
        description: "Field name already exists",
        variant: "destructive",
      });
      return;
    }

    createFieldMutation.mutate({
      fieldName: newField.fieldName,
      fieldType: newField.fieldType,
      isRequired: false,
    });
  };

  const allFields = [
    ...DEFAULT_FIELDS,
    ...customFields.map(field => ({ ...field, isDefault: false }))
  ];

  const isDefaultField = (fieldName: string) => {
    return DEFAULT_FIELDS.some(f => f.fieldName === fieldName);
  };

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
            Customize the fields for people in this social graph
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {allFields.map((field) => (
            <div key={field.fieldName} className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{field.fieldName}</p>
                <p className="text-sm text-muted-foreground">{field.fieldType}</p>
              </div>
              {!isDefaultField(field.fieldName) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => field.id && deleteFieldMutation.mutate(field.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <div className="flex items-center gap-2 pt-4 border-t">
            <Input
              placeholder="Field name"
              value={newField.fieldName}
              onChange={(e) => setNewField(prev => ({ ...prev, fieldName: e.target.value }))}
            />
            <Select
              value={newField.fieldType}
              onValueChange={(value) => setNewField(prev => ({ ...prev, fieldType: value }))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="tel">Phone</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddField}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}