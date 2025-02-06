import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, Linkedin, Twitter, Building2, Briefcase, Settings } from "lucide-react";
import { ContactFormDialog } from "./ContactFormDialog";

interface ContactDetailsPopupProps {
  contact: {
    id: number;
    name: string;
    jobTitle?: string;
    organization?: string;
    officeNumber?: string;
    mobileNumber?: string;
    email1?: string;
    email2?: string;
    linkedin?: string;
    twitter?: string;
    notes?: string;
    interactions?: Array<{
      date: string;
      type: string;
    }>;
  };
  onClose: () => void;
  graphId: number;
}

const InteractionHeatmap = ({ interactions }: { interactions?: Array<{ date: string }> }) => {
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  const weeks = [];

  // Create array of weeks
  for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 7)) {
    weeks.push(new Date(d));
  }

  // Count interactions per week
  const interactionCounts = new Map<string, number>();
  interactions?.forEach(interaction => {
    const week = new Date(interaction.date).toISOString().split('T')[0];
    interactionCounts.set(week, (interactionCounts.get(week) || 0) + 1);
  });

  return (
    <div className="flex flex-wrap gap-1">
      {weeks.map((week, i) => {
        const weekStr = week.toISOString().split('T')[0];
        const count = interactionCounts.get(weekStr) || 0;
        return (
          <div
            key={i}
            className={`w-3 h-3 rounded-sm ${
              count === 0 ? 'bg-muted' :
              count === 1 ? 'bg-blue-200' :
              count === 2 ? 'bg-blue-400' :
              'bg-blue-600'
            }`}
            title={`${week.toLocaleDateString()}: ${count} interactions`}
          />
        );
      })}
    </div>
  );
};

export function ContactDetailsPopup({ contact, onClose, graphId }: ContactDetailsPopupProps) {
  const [showEdit, setShowEdit] = useState(false);

  const contactInfo = [
    { icon: Phone, label: "Office", value: contact.officeNumber, href: `tel:${contact.officeNumber}` },
    { icon: Phone, label: "Mobile", value: contact.mobileNumber, href: `tel:${contact.mobileNumber}` },
    { icon: Mail, label: "Primary Email", value: contact.email1, href: `mailto:${contact.email1}` },
    { icon: Mail, label: "Secondary Email", value: contact.email2, href: `mailto:${contact.email2}` },
    { icon: Linkedin, label: "LinkedIn", value: "View Profile", href: contact.linkedin },
    { icon: Twitter, label: "Twitter", value: "View Profile", href: contact.twitter },
  ].filter(item => item.value); // Only show items with values

  return (
    <>
      <Card className="absolute bottom-0 left-0 right-0 h-[40%] z-50 overflow-hidden border-t">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/40">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{contact.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                {contact.jobTitle && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    <span>{contact.jobTitle}</span>
                  </div>
                )}
                {contact.organization && (
                  <>
                    {contact.jobTitle && <span>•</span>}
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <span>{contact.organization}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setShowEdit(true)}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                ✕
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="details" className="flex-1">
            <div className="px-4 py-2 border-b bg-muted/40">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="interactions">Interactions</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 overflow-y-auto">
              <TabsContent value="details" className="m-0">
                <div className="grid gap-4">
                  {contactInfo.map((item, index) => (
                    item.value && (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">{item.label}</p>
                          {item.href ? (
                            <a
                              href={item.href}
                              target={item.icon === Linkedin || item.icon === Twitter ? "_blank" : undefined}
                              rel={item.icon === Linkedin || item.icon === Twitter ? "noopener noreferrer" : undefined}
                              className="text-sm font-medium hover:underline"
                            >
                              {item.value}
                            </a>
                          ) : (
                            <p className="text-sm font-medium">{item.value}</p>
                          )}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="notes" className="m-0">
                {contact.notes ? (
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No notes available.</p>
                )}
              </TabsContent>

              <TabsContent value="interactions" className="m-0">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Interaction History</h4>
                  <InteractionHeatmap interactions={contact.interactions} />
                  {(!contact.interactions || contact.interactions.length === 0) && (
                    <p className="text-sm text-muted-foreground">No interactions recorded yet.</p>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </Card>

      <ContactFormDialog
        contact={contact}
        open={showEdit}
        onOpenChange={setShowEdit}
        graphId={graphId}
      />
    </>
  );
}