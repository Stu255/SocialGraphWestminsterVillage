import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, Linkedin, Twitter } from "lucide-react";

interface ContactDetailsPopupProps {
  contact: {
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
  };
  onClose: () => void;
}

export function ContactDetailsPopup({ contact, onClose }: ContactDetailsPopupProps) {
  return (
    <Card className="absolute bottom-0 left-0 right-0 h-[20%] z-50 overflow-hidden border-t">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-muted/40">
          <div>
            <h3 className="font-semibold">{contact.name}</h3>
            {contact.jobTitle && contact.organization && (
              <p className="text-sm text-muted-foreground">
                {contact.jobTitle} at {contact.organization}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <Tabs defaultValue="details" className="flex-1">
          <div className="px-4 py-2 border-b bg-muted/40">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4 overflow-y-auto">
            <TabsContent value="details" className="m-0">
              <div className="space-y-3">
                {(contact.officeNumber || contact.mobileNumber) && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-1" />
                    <div className="space-y-1">
                      {contact.officeNumber && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Office:</span> {contact.officeNumber}
                        </p>
                      )}
                      {contact.mobileNumber && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Mobile:</span> {contact.mobileNumber}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {(contact.email1 || contact.email2) && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-1" />
                    <div className="space-y-1">
                      {contact.email1 && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Email 1:</span> {contact.email1}
                        </p>
                      )}
                      {contact.email2 && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Email 2:</span> {contact.email2}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {contact.linkedin && (
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4" />
                    <a 
                      href={contact.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      LinkedIn Profile
                    </a>
                  </div>
                )}

                {contact.twitter && (
                  <div className="flex items-center gap-2">
                    <Twitter className="h-4 w-4" />
                    <a
                      href={contact.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Twitter Profile
                    </a>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="m-0">
              {contact.notes ? (
                <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No notes available.</p>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Card>
  );
}
