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
import { UseMutationResult } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AddOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
  mutation: UseMutationResult<any, Error, any>;
}

const STEPS = [
  {
    title: "Basic Information",
    description: "Enter the organization's name and branding colors",
    fields: ["name", "brandColor", "accentColor"]
  },
  {
    title: "Business Information",
    description: "Add the organization's online presence and location",
    fields: ["website", "industry", "hqCity"]
  },
  {
    title: "Company Details",
    description: "Provide additional company information",
    fields: ["headcount", "turnover"]
  }
];

export function AddOrganizationDialog({ 
  open, 
  onOpenChange, 
  graphId,
  mutation 
}: AddOrganizationDialogProps) {
  const [step, setStep] = useState(0);

  const form = useForm({
    defaultValues: {
      name: "",
      brandColor: "#000000",
      accentColor: "#000000",
      website: "",
      industry: "",
      hqCity: "",
      headcount: "",
      turnover: ""
    },
  });

  const onSubmit = async (data: any) => {
    if (isLastStep) {
      try {
        if (!data.name?.trim()) {
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

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

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
                  name={field}
                  rules={{ required: field === "name" ? "Name is required" : false }}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel className="capitalize">
                        {field.replace(/([A-Z])/g, ' $1').trim()}
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
                  mutation.isPending ? "Adding..." : "Add Organization"
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