import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Define relationship types and their line styles
export const RELATIONSHIP_TYPES = [
  { id: 1, name: "Allied", style: "heavy-line", description: "Heavy line" },
  { id: 2, name: "Trusted", style: "double-line", description: "Double line" },
  { id: 3, name: "Close", style: "standard-line", description: "Standard line" },
  { id: 4, name: "Connected", style: "thin-line", description: "Thin line" },
  { id: 5, name: "Acquainted", style: "dashed-line", description: "Thin dashed line" }
];

function RelationshipTypesDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Relationship Types</DialogTitle>
          <DialogDescription>
            Available relationship types and their visual representations
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {RELATIONSHIP_TYPES.map((type) => (
            <div key={type.id} className="flex items-center justify-between p-2 rounded-lg border">
              <div>
                <h4 className="font-medium">{type.name}</h4>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </div>
              <div className={`w-16 h-px bg-foreground ${
                type.style === 'heavy-line' ? 'h-0.5' :
                type.style === 'double-line' ? 'border-t border-b h-1.5' :
                type.style === 'standard-line' ? '' :
                type.style === 'thin-line' ? 'h-px opacity-60' :
                'border-dashed border-t opacity-60'
              }`} />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RelationshipTypeManager() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relationship Types</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          className="w-full"
          variant="outline"
          onClick={() => setShowDialog(true)}
        >
          <Users className="h-4 w-4 mr-2" />
          See Relationships
        </Button>

        <RelationshipTypesDialog
          open={showDialog}
          onOpenChange={setShowDialog}
        />
      </CardContent>
    </Card>
  );
}