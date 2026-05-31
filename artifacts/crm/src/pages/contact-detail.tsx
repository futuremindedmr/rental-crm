import { useParams, Link } from "wouter";
import { useGetContact, useListActivities, useListDeals } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Building2, Briefcase, ArrowLeft } from "lucide-react";

export default function ContactDetail() {
  const params = useParams();
  const id = Number(params.id);

  const { data: contact, isLoading: contactLoading } = useGetContact(id);
  const { data: activities, isLoading: activitiesLoading } = useListActivities({ contactId: id });
  const { data: deals, isLoading: dealsLoading } = useListDeals({ contactId: id });

  if (contactLoading || activitiesLoading || dealsLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading contact details...</div>;
  }

  if (!contact) {
    return <div className="p-8 text-center text-muted-foreground">Contact not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link href="/contacts">
          <span className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 mb-4 cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Back to Contacts
          </span>
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{contact.firstName} {contact.lastName}</h1>
            <div className="flex gap-4 mt-2 text-muted-foreground text-sm">
              <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {contact.title || "No Title"}</span>
              <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> {contact.companyName || "No Company"}</span>
            </div>
          </div>
          <Badge variant={contact.status === "customer" ? "default" : "secondary"} className="text-sm px-3 py-1">
            {contact.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{contact.phone || "No phone provided"}</span>
              </div>
              {contact.notes && (
                <div className="pt-4 border-t mt-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Notes</p>
                  {contact.notes}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Linked Deals</CardTitle>
            </CardHeader>
            <CardContent>
              {deals?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deals linked to this contact.</p>
              ) : (
                <div className="space-y-3">
                  {deals?.map(deal => (
                    <div key={deal.id} className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <p className="font-medium">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">Stage: {deal.stage}</p>
                      </div>
                      <div className="font-bold">${deal.value?.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              {activities?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activities linked to this contact.</p>
              ) : (
                <div className="space-y-3">
                  {activities?.map(activity => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-md">
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-primary" />
                      <div>
                        <p className={`text-sm font-medium ${activity.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {activity.subject}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{activity.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
