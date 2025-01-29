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

interface AddOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
  mutation: UseMutationResult<any, Error, any>;
}

export function AddOrganizationDialog({ 
  open, 
  onOpenChange, 
  graphId,
  mutation 
}: AddOrganizationDialogProps) {
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
    try {
      await mutation.mutateAsync(data);
    } catch (error) {
      // Error is handled by mutation's onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Organization</DialogTitle>
          <DialogDescription>
            Add a new organization to your network
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="brandColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Color</FormLabel>
                  <FormControl>
                    <Input {...field} type="color" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accentColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Accent Color</FormLabel>
                  <FormControl>
                    <Input {...field} type="color" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input {...field} type="url" placeholder="https://" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hqCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HQ City</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="headcount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headcount</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="turnover"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Turnover</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. $1M - $5M" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full"
            >
              {mutation.isPending ? "Adding..." : "Add Organization"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
