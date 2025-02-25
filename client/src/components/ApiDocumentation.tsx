import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ApiDocumentationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiDocumentation({ open, onOpenChange }: ApiDocumentationProps) {
  const baseUrl = "https://kozzect.com";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>API Documentation</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-2">Authentication</h2>
              <p className="text-sm text-muted-foreground mb-4">
                All API requests require a bearer token for authentication. Add the following header to your requests:
              </p>
              <pre className="bg-muted p-4 rounded-md text-sm">
                Authorization: Bearer your_api_token
              </pre>
            </section>

            <Tabs defaultValue="contacts">
              <TabsList>
                <TabsTrigger value="contacts">Contacts</TabsTrigger>
                <TabsTrigger value="organizations">Organizations</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
              </TabsList>

              <TabsContent value="contacts" className="mt-4 space-y-6">
                <div>
                  <h3 className="text-md font-semibold">Create Contact</h3>
                  <p className="text-sm text-muted-foreground my-2">
                    POST {baseUrl}/api/v1/contacts?graphId=:graphId
                  </p>
                  <pre className="bg-muted p-4 rounded-md text-sm">
{`// Request body
{
  "name": "John Doe",
  "jobTitle": "Software Engineer",
  "organization": "Tech Corp",
  "relationshipToYou": 3,
  "lastContact": "2024-02-25",
  "officeNumber": "+1234567890",
  "mobileNumber": "+1987654321",
  "email1": "john@example.com",
  "email2": "john.doe@example.com",
  "linkedin": "https://linkedin.com/in/johndoe",
  "twitter": "@johndoe",
  "notes": "Met at conference"
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-md font-semibold">Update Contact</h3>
                  <p className="text-sm text-muted-foreground my-2">
                    PUT {baseUrl}/api/v1/contacts/:id
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Uses the same request body format as create contact.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="organizations" className="mt-4 space-y-6">
                <div>
                  <h3 className="text-md font-semibold">Create Organization</h3>
                  <p className="text-sm text-muted-foreground my-2">
                    POST {baseUrl}/api/v1/organizations
                  </p>
                  <pre className="bg-muted p-4 rounded-md text-sm">
{`// Request body
{
  "graphId": 123,
  "name": "Tech Corp",
  "industry": "Technology",
  "hqCity": "San Francisco",
  "website": "https://techcorp.com",
  "headcount": 500,
  "turnover": "100M",
  "brandColor": "#FF0000",
  "accentColor": "#00FF00"
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-md font-semibold">Update Organization</h3>
                  <p className="text-sm text-muted-foreground my-2">
                    PUT {baseUrl}/api/v1/organizations/:id
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Uses the same request body format as create organization.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="connections" className="mt-4 space-y-6">
                <div>
                  <h3 className="text-md font-semibold">Create Connection</h3>
                  <p className="text-sm text-muted-foreground my-2">
                    POST {baseUrl}/api/v1/connections
                  </p>
                  <pre className="bg-muted p-4 rounded-md text-sm">
{`// Request body
{
  "graphId": 123,
  "sourcePersonId": 456,
  "targetPersonId": 789,
  "connectionType": 3
}`}
                  </pre>
                  <p className="text-sm text-muted-foreground mt-2">
                    Connection types: 0 (None), 1 (Acquainted), 2 (Familiar), 3 (Close), 4 (Trusted), 5 (Allied)
                  </p>
                </div>

                <div>
                  <h3 className="text-md font-semibold">Update Connection</h3>
                  <p className="text-sm text-muted-foreground my-2">
                    PUT {baseUrl}/api/v1/connections/:id
                  </p>
                  <pre className="bg-muted p-4 rounded-md text-sm">
{`// Request body
{
  "connectionType": 4
}`}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>

            <section>
              <h2 className="text-lg font-semibold mb-2">Managing API Tokens</h2>
              <p className="text-sm text-muted-foreground mb-4">
                To use the API, you need to generate an API token from your user settings. 
                Go to Settings → API Tokens to create and manage your tokens.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
