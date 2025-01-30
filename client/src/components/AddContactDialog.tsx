import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RelationshipLevel } from "@db/schema";

interface AddContactDialogProps {
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
    description: "Add phone numbers and email addresses",
    fields: ["officeNumber", "mobileNumber", "email1", "email2"]
  },
  {
    title: "Additional Information",
    description: "Social media and notes",
    fields: ["linkedin", "twitter", "lastContact", "notes"]
  }
];

// Available relationship types for the UI
const RELATIONSHIP_OPTIONS = [
  { value: RelationshipLevel.ALLIED.toString(), label: "Allied" },
  { value: RelationshipLevel.TRUSTED.toString(), label: "Trusted" },
  { value: RelationshipLevel.CLOSE.toString(), label: "Close" },
  { value: RelationshipLevel.CONNECTED.toString(), label: "Connected" },
  { value: RelationshipLevel.ACQUAINTED.toString(), label: "Acquainted" },
];

export function AddContactDialog({ open, onOpenChange, graphId }: AddContactDialogProps) {
  const [step, setStep] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const transformedData = {
        name: values.name,
        job_title: values.jobTitle || null,
        organization: values.organization || null,
        relationship_to_you: values.relationshipToYou ? parseInt(values.relationshipToYou) : null,
        last_contact: values.lastContact ? new Date(values.lastContact).toISOString() : null,
        office_number: values.officeNumber || null,
        mobile_number: values.mobileNumber || null,
        email_1: values.email1 || null,
        email_2: values.email2 || null,
        linkedin: values.linkedin || null,
        twitter: values.twitter || null,
        notes: values.notes || null,
        graph_id: graphId
      };

      console.log('Submitting data:', transformedData);

      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformedData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Server response:', errorText);
        throw new Error(errorText || "Failed to create contact");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people", graphId] });
      onOpenChange(false);
      form.reset();
      setStep(0);
      toast({
        title: "Success",
        description: "Contact added successfully",
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

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const onSubmit = async (data: any) => {
    if (isLastStep) {
      try {
        if (!data.name?.trim()) {
          toast({
            title: "Error",
            description: "Name is required",
            variant: "destructive",
          });
          return;
        }
        if (!data.relationshipToYou) {
          toast({
            title: "Error",
            description: "Relationship type is required",
            variant: "destructive",
          });
          return;
        }
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
                  name={field as any}
                  rules={{
                    required: field === "name" ? "Name is required" :
                             field === "relationshipToYou" ? "Relationship type is required" :
                             false
                  }}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel className="capitalize">
                        {field === "email1" ? "Email Address 1" :
                         field === "email2" ? "Email Address 2" :
                         field === "relationshipToYou" ? "Relationship To You" :
                         field.replace(/([A-Z])/g, ' $1').trim()}
                      </FormLabel>
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
                              {RELATIONSHIP_OPTIONS.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field === "notes" ? (
                          <Textarea {...formField} className="min-h-[100px]" />
                        ) : field === "lastContact" ? (
                          <Input {...formField} type="date" />
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
                disabled={step === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <Button
                type="submit"
                disabled={mutation.isPending}
              >
                {isLastStep ? (
                  mutation.isPending ? "Adding..." : "Add Contact"
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}