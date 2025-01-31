import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditOrganizationDialogProps {
  organization: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

const STEPS = [
  {
    title: "Basic Information",
    description: "Update the organization's name and branding colors",
    fields: ["name", "brandColor", "accentColor"]
  },
  {
    title: "Business Information",
    description: "Edit the organization's online presence and location",
    fields: ["website", "industry", "hqCity"]
  },
  {
    title: "Company Details",
    description: "Update additional company information",
    fields: ["headcount", "turnover"]
  }
];

const FIELD_LABELS: Record<string, string> = {
  name: "Organization Name",
  brandColor: "Brand Color",
  accentColor: "Accent Color",
  website: "Website",
  industry: "Industry",
  hqCity: "Headquarters City",
  headcount: "Employee Count",
  turnover: "Annual Turnover"
};

export function EditOrganizationDialog({
  organization,
  open,
  onOpenChange,
  graphId
}: EditOrganizationDialogProps) {
  const [step, setStep] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      name: organization?.name || "",
      brandColor: organization?.brandColor || "#000000",
      accentColor: organization?.accentColor || "#000000",
      website: organization?.website || "",
      industry: organization?.industry || "",
      hqCity: organization?.hqCity || "",
      headcount: organization?.headcount || "",
      turnover: organization?.turnover || ""
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      console.log("Sending update request with values:", { ...values, graphId });
      const res = await fetch(`/api/organizations/${organization.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, graphId }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update organization");
      }

      const data = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", graphId] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Organization updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
                  name={field as keyof typeof FIELD_LABELS}
                  rules={{ required: field === "name" ? "Name is required" : false }}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>
                        {FIELD_LABELS[field]}
                      </FormLabel>
                      <FormControl>
                        {field === "brandColor" || field === "accentColor" ? (
                          <Input {...formField} type="color" />
                        ) : field === "website" ? (
                          <Input {...formField} type="url" placeholder="https://" />
                        ) : field === "headcount" ? (
                          <Input {...formField} type="number" />
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
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <Button
                type="submit"
                disabled={mutation.isPending}
              >
                {isLastStep ? (
                  mutation.isPending ? "Saving..." : "Save Changes"
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