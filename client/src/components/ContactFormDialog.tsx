import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RELATIONSHIP_TYPES, getRelationshipNameById, getRelationshipIdByName } from "./RelationshipTypeManager";

interface ContactFormDialogProps {
  contact?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

const STEPS = [
  {
    title: "Basic Information",
    description: "Enter the contact's name and role",
    fields: ["name", "jobTitle", "organization", "relationshipToYou"]
  },
  {
    title: "Contact Information",
    description: "Update phone numbers and email addresses",
    fields: ["officeNumber", "mobileNumber", "email1", "email2"]
  },
  {
    title: "Social Media",
    description: "Manage social media profiles",
    fields: ["linkedin", "twitter"]
  },
  {
    title: "Notes",
    description: "Add detailed notes about this contact",
    fields: ["notes"]
  }
];

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  jobTitle: "Job Title",
  organization: "Organization",
  relationshipToYou: "Relationship To You",
  officeNumber: "Office Number",
  mobileNumber: "Mobile Number",
  email1: "Email Address 1",
  email2: "Email Address 2",
  linkedin: "LinkedIn",
  twitter: "Twitter",
  notes: "Notes"
};

export function ContactFormDialog({ contact, open, onOpenChange, graphId }: ContactFormDialogProps) {
  const [step, setStep] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch organizations for the dropdown
  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/organizations", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch organizations");
      return res.json();
    },
  });

  const form = useForm({
    defaultValues: {
      name: contact?.name || "",
      jobTitle: contact?.jobTitle || "",
      organization: contact?.organization || "",
      relationshipToYou: contact?.relationshipToYou ? getRelationshipNameById(contact.relationshipToYou) : "",
      officeNumber: contact?.officeNumber || "",
      mobileNumber: contact?.mobileNumber || "",
      email1: contact?.email1 || "",
      email2: contact?.email2 || "",
      linkedin: contact?.linkedin || "",
      twitter: contact?.twitter || "",
      notes: contact?.notes || ""
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      // Transform the data to match the backend expectations
      const transformedData = {
        name: values.name,
        jobTitle: values.jobTitle,
        organization: values.organization,
        relationshipToYou: values.relationshipToYou ? getRelationshipIdByName(values.relationshipToYou) : null,
        officeNumber: values.officeNumber || null,
        mobileNumber: values.mobileNumber || null,
        email1: values.email1 || null,
        email2: values.email2 || null,
        linkedin: values.linkedin || null,
        twitter: values.twitter || null,
        notes: values.notes || null,
        graphId: graphId  // Use graphId directly, not graph_id
      };

      console.log("Sending contact data:", transformedData);

      const url = contact ? `/api/people/${contact.id}` : "/api/people";
      const method = contact ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformedData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Contact submission error:", errorText);
        throw new Error(errorText || `Failed to ${contact ? 'update' : 'create'} contact`);
      }

      const data = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people", graphId] });
      onOpenChange(false);
      setStep(0);
      form.reset();
      toast({
        title: "Success",
        description: `Contact ${contact ? 'updated' : 'added'} successfully`,
      });
    },
    onError: (error: Error) => {
      console.error("Contact mutation error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: any) => {
    if (!data.name?.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    if (step === 0 && !data.relationshipToYou) {
      toast({
        title: "Error",
        description: "Relationship type is required",
        variant: "destructive",
      });
      return;
    }

    if (isLastStep) {
      try {
        await mutation.mutateAsync(data);
      } catch (error) {
        // Error is handled by mutation's onError
      }
    } else {
      setStep(s => s + 1);
    }
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    setStep(s => s - 1);
  };

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const isFirstStep = step === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{currentStep.title}</DialogTitle>
          <DialogDescription>
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              {currentStep.fields.map((field) => (
                <FormField
                  key={field}
                  control={form.control}
                  name={field as keyof typeof form.formState.defaultValues}
                  rules={{
                    required: field === "name" ? "Name is required" :
                             field === "relationshipToYou" ? "Relationship type is required" :
                             false
                  }}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>{FIELD_LABELS[field]}</FormLabel>
                      <FormControl>
                        {field === "relationshipToYou" ? (
                          <Select
                            onValueChange={formField.onChange}
                            defaultValue={formField.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select relationship type" />
                            </SelectTrigger>
                            <SelectContent>
                              {RELATIONSHIP_TYPES.map(type => (
                                <SelectItem key={type.id} value={type.name}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field === "organization" ? (
                          <Select
                            onValueChange={formField.onChange}
                            defaultValue={formField.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select organization" />
                            </SelectTrigger>
                            <SelectContent>
                              {organizations.map((org: any) => (
                                <SelectItem key={org.id} value={org.name}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field === "notes" ? (
                          <Textarea {...formField} className="min-h-[100px]" />
                        ) : (
                          <Input {...formField} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstStep}
              >
                Previous
              </Button>

              <Button type="submit" disabled={mutation.isPending}>
                {isLastStep ? (
                  mutation.isPending ? 
                    (contact ? "Updating..." : "Adding...") : 
                    (contact ? "Update Contact" : "Add Contact")
                ) : (
                  "Next"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}