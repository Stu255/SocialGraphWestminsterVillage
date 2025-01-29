import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
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
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

const STEPS = [
  {
    title: "Basic Information",
    fields: ["name", "jobTitle", "organization"]
  },
  {
    title: "Contact Details",
    fields: ["officeNumber", "mobileNumber", "email1", "email2"]
  },
  {
    title: "Social & Notes",
    fields: ["linkedin", "twitter", "notes"]
  }
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
      officeNumber: "",
      mobileNumber: "",
      email1: "",
      email2: "",
      linkedin: "",
      twitter: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const transformedData = {
        name: values.name,
        job_title: values.jobTitle,
        organization: values.organization,
        office_number: values.officeNumber,
        mobile_number: values.mobileNumber,
        email_1: values.email1,
        email_2: values.email2,
        linkedin: values.linkedin,
        twitter: values.twitter,
        notes: values.notes,
        graph_id: graphId
      };

      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformedData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to add contact");
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
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              {currentStep.fields.map((field) => (
                <FormField
                  key={field}
                  control={form.control}
                  name={field as any}
                  rules={{ required: field === "name" ? "Name is required" : false }}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel className="capitalize">
                        {field === "email1" ? "Email Address 1" :
                         field === "email2" ? "Email Address 2" :
                         field.replace(/([A-Z])/g, ' $1').trim()}
                      </FormLabel>
                      <FormControl>
                        {field === "notes" ? (
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