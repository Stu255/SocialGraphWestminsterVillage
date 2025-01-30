import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, X, Check, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useFieldPreferences } from "@/hooks/use-field-preferences";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { getRelationshipLabel, getRelationshipLevel, RelationshipLevel } from "@db/schema";

interface AnalysisPanelProps {
  selectedNode: any;
  nodes: any[];
  relationships: any[];
  onNodeDeleted?: () => void;
  graphId: number;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  jobTitle: "Job Title",
  organization: "Organization",
  relationshipToYou: "Relationship To You",
  lastContact: "Last Contact",
  officeNumber: "Office Number",
  mobileNumber: "Mobile Number",
  email1: "Email Address 1",
  email2: "Email Address 2",
  linkedin: "LinkedIn",
  twitter: "Twitter",
  notes: "Notes"
};

// Available relationship types for the UI
const RELATIONSHIP_OPTIONS = [
  { value: RelationshipLevel.ALLIED.toString(), label: "Allied" },
  { value: RelationshipLevel.TRUSTED.toString(), label: "Trusted" },
  { value: RelationshipLevel.CLOSE.toString(), label: "Close" },
  { value: RelationshipLevel.CONNECTED.toString(), label: "Connected" },
  { value: RelationshipLevel.ACQUAINTED.toString(), label: "Acquainted" },
];

export function AnalysisPanel({ selectedNode, nodes, relationships, onNodeDeleted, graphId }: AnalysisPanelProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const { data: fieldPreferences } = useFieldPreferences(graphId);
  const [currentRelationshipType, setCurrentRelationshipType] = useState<string>("");

  // Get visible fields in the correct order
  const visibleFields = fieldPreferences?.order?.filter(
    field => !fieldPreferences?.hidden?.includes(field)
  ) || Object.keys(FIELD_LABELS);
  console.log("Visible fields:", visibleFields);
  console.log("Field Preferences:", fieldPreferences);

  // Query centrality data and calculate top people
  const { data: centrality } = useQuery({
    queryKey: ["/api/analysis/centrality", graphId],
    enabled: !!nodes.length,
  });

  const topPeople = centrality
    ?.sort((a: any, b: any) => b.centrality - a.centrality)
    .slice(0, 10) || [];

  const nodeMetrics = centrality?.find((c: any) => c.id === selectedNode?.id);
  const nodeRelationships = relationships.filter(r =>
    r.sourcePersonId === selectedNode?.id ||
    r.targetPersonId === selectedNode?.id
  );

  const form = useForm({
    defaultValues: {
      name: "",
      jobTitle: "",
      organization: "",
      relationshipToYou: "",
      lastContact: "",
      officeNumber: "",
      mobileNumber: "",
      email1: "",
      email2: "",
      linkedin: "",
      twitter: "",
      notes: ""
    }
  });

  const updatePersonMutation = useMutation({
    mutationFn: async (values: any) => {
      console.log('Frontend: Starting update mutation with values:', values);

      // Convert relationshipToYou from string to number
      const transformedValues = {
        ...values,
        relationshipToYou: values.relationshipToYou ? parseInt(values.relationshipToYou) : null
      };

      const res = await fetch(`/api/people/${selectedNode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...transformedValues, graphId }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Frontend: Server error response:', errorText);
        throw new Error(errorText || "Failed to update person");
      }

      const responseData = await res.json();
      console.log('Frontend: Server response data:', responseData);
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people", graphId] });
      setIsEditing(false);
    },
  });

  const onSubmit = (data: any) => {
    if (!data.name?.trim()) {
      console.log('Form validation failed: Empty name');
      return;
    }
    console.log('Form submission data:', data);
    console.log('Relationship value:', data.relationshipToYou);

    updatePersonMutation.mutate(data);
  };

  // Initialize form values when node is selected or editing mode changes
  useEffect(() => {
    if (selectedNode) {
      console.log('Loading node data:', selectedNode);
      const formValues = {
        name: selectedNode.name || "",
        jobTitle: selectedNode.jobTitle || "",
        organization: selectedNode.organization || "",
        relationshipToYou: selectedNode.relationshipToYou ? selectedNode.relationshipToYou.toString() : "",
        lastContact: selectedNode.lastContact ? new Date(selectedNode.lastContact).toISOString().split('T')[0] : "",
        officeNumber: selectedNode.officeNumber || "",
        mobileNumber: selectedNode.mobileNumber || "",
        email1: selectedNode.email1 || "",
        email2: selectedNode.email2 || "",
        linkedin: selectedNode.linkedin || "",
        twitter: selectedNode.twitter || "",
        notes: selectedNode.notes || ""
      };
      console.log('Setting form values:', formValues);
      form.reset(formValues);
      setCurrentRelationshipType(formValues.relationshipToYou);
    }
  }, [selectedNode, isEditing, form]);

  const deletePersonMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/people/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to delete person");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people", graphId] });
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", graphId] });
      if (onNodeDeleted) onNodeDeleted();
    },
  });

  const deleteRelationshipMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/relationships/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to delete relationship");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", graphId] });
    },
  });

  const renderField = (fieldName: string) => {
    if (isEditing) {
      return (
        <FormField
          key={fieldName}
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{FIELD_LABELS[fieldName]}</FormLabel>
              <FormControl>
                {fieldName === "relationshipToYou" ? (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship type" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : fieldName === "notes" ? (
                  <Textarea
                    {...field}
                    className="min-h-[100px]"
                  />
                ) : fieldName === "lastContact" ? (
                  <Input
                    {...field}
                    type="date"
                  />
                ) : (
                  <Input {...field} />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    let value = selectedNode[fieldName];
    if (fieldName === "lastContact" && value) {
      value = new Date(value).toLocaleDateString();
    } else if (fieldName === "relationshipToYou" && value) {
      value = getRelationshipLabel(value);
    }

    return (
      <p key={fieldName}>
        <strong>{FIELD_LABELS[fieldName]}:</strong> {value || "Not specified"}
      </p>
    );
  };

  if (!selectedNode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select a node to view detailed analysis
            </p>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Top 10 Most Connected People</h3>
              {topPeople.map((person: any, index: number) => (
                <div key={person.id} className="flex justify-between items-center text-sm">
                  <span>{index + 1}. {person.name}</span>
                  <span className="text-muted-foreground">{person.centrality.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onNodeDeleted}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{selectedNode.name}</h2>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Profile</CardTitle>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={updatePersonMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Person</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {selectedNode.name} and all their relationships.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deletePersonMutation.mutate(selectedNode.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {visibleFields.map(field => renderField(field))}
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Network Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Centrality Score:</strong> {nodeMetrics?.centrality.toFixed(3) || 0}</p>
            <p><strong>Direct Connections:</strong> {nodeRelationships.length}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {nodeRelationships.map(rel => {
              const otherNode = nodes.find(n =>
                n.id === (rel.sourcePersonId === selectedNode.id ?
                  rel.targetPersonId :
                  rel.sourcePersonId
                )
              );

              return (
                <div key={rel.id} className="flex items-center justify-between">
                  <span>
                    {rel.sourcePersonId === selectedNode.id ? "→" : "←"} {otherNode?.name}
                    ({getRelationshipLabel(rel.level)})
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRelationshipMutation.mutate(rel.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}