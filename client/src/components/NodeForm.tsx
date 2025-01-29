import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MultiStepRelationshipDialog } from "./MultiStepRelationshipDialog";
import { FieldSettingsDialog } from "./FieldSettingsDialog";
import { useToast } from "@/hooks/use-toast";

interface Affiliation {
  id: number;
  name: string;
  color: string;
}

interface CustomField {
  id: number;
  fieldName: string;
  fieldType: string;
  isRequired: boolean;
}

interface NodeFormProps {
  graphId: number;
}

export function NodeForm({ graphId }: NodeFormProps) {
  const [showRelationshipDialog, setShowRelationshipDialog] = useState(false);
  const [newPerson, setNewPerson] = useState<{ id: number; name: string } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: affiliations = [] } = useQuery<Affiliation[]>({
    queryKey: ["/api/affiliations", graphId],
  });

  const { data: customFields = [] } = useQuery<CustomField[]>({
    queryKey: ["/api/custom-fields", graphId],
  });

  const form = useForm({
    defaultValues: {
      name: "",
      roleTitle: "",
      affiliation: "",
      notes: "",
      graphId,
      ...Object.fromEntries(customFields.map(field => [field.fieldName, ""]))
    },
  });

  // Update form when custom fields change
  useEffect(() => {
    const customFieldValues = Object.fromEntries(customFields.map(field => [field.fieldName, ""]));
    form.reset({ ...form.getValues(), ...customFieldValues });
  }, [customFields]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      // Extract custom field values
      const standardFields = ["name", "roleTitle", "affiliation", "notes", "graphId"];
      const customFieldValues: Record<string, string> = {};

      Object.keys(values).forEach(key => {
        if (!standardFields.includes(key)) {
          customFieldValues[key] = values[key];
          delete values[key];
        }
      });

      // Store custom field values in notes as JSON
      if (Object.keys(customFieldValues).length > 0) {
        try {
          const existingNotes = values.notes ? JSON.parse(values.notes) : {};
          values.notes = JSON.stringify({
            ...existingNotes,
            customFields: customFieldValues,
            text: existingNotes.text || ""
          });
        } catch {
          // If notes isn't valid JSON, wrap existing notes text
          values.notes = JSON.stringify({
            customFields: customFieldValues,
            text: values.notes || ""
          });
        }
      }

      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to create person");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/people", graphId] });
      setNewPerson({ id: data.id, name: data.name });
      setShowRelationshipDialog(true);
      form.reset();
      toast({
        title: "Success",
        description: "Person added successfully",
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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Add Person</CardTitle>
          <FieldSettingsDialog graphId={graphId} />
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roleTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="affiliation"
                rules={{ required: "Affiliation is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Affiliation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select affiliation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {affiliations.map((affiliation) => (
                          <SelectItem key={affiliation.id} value={affiliation.name}>
                            {affiliation.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Render custom fields */}
              {customFields.map((field) => (
                <FormField
                  key={field.id}
                  control={form.control}
                  name={field.fieldName}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>{field.fieldName}</FormLabel>
                      <FormControl>
                        <Input type={field.fieldType} {...formField} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Add notes about this person..."
                        className="min-h-[100px]"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Adding..." : "Add Person"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <MultiStepRelationshipDialog
        open={showRelationshipDialog}
        onOpenChange={setShowRelationshipDialog}
        newPerson={newPerson}
        graphId={graphId}
      />
    </>
  );
}