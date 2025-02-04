import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { USER_RELATIONSHIP_TYPES } from "./RelationshipTypeManager";

interface Node {
  id: number;
  name: string;
  organization?: string;
  jobTitle?: string;
  relationshipToYou?: number;
  currentRole?: string;
}

interface NodeInfoDialogProps {
  node: Node | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NodeInfoDialog({ node, open, onOpenChange }: NodeInfoDialogProps) {
  const getRelationshipType = (type: number | undefined) => {
    if (type === undefined) return "Not specified";
    const relationshipType = USER_RELATIONSHIP_TYPES.find(t => t.id === type);
    return relationshipType ? relationshipType.name : "Not specified";
  };

  if (!node) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{node.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-sm text-muted-foreground">Organization</div>
            <div className="text-sm">{node.organization || "Not specified"}</div>
            
            <div className="text-sm text-muted-foreground">Job Title</div>
            <div className="text-sm">{node.jobTitle || "Not specified"}</div>
            
            <div className="text-sm text-muted-foreground">Relationship</div>
            <div className="text-sm">{getRelationshipType(node.relationshipToYou)}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
