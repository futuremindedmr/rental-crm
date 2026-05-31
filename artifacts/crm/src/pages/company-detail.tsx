import { useParams, Link } from "wouter";
import { useGetCompany, useListContacts, useListDeals } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, MapPin, Users, Phone, ArrowLeft } from "lucide-react";

export default function CompanyDetail() {
  const params = useParams();
  const id = Number(params.id);

  const { data: company, isLoading: companyLoading } = useGetCompany(id);
  const { data: contacts, isLoading: contactsLoading } = useListContacts({ companyId: id });
  const { data: deals, isLoading: dealsLoading } = useListDeals({ companyId: id });

  if (companyLoading || contactsLoading || dealsLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading company details...</div>;
  }

  if (!company) {
    return <div className="p-8 text-center text-muted-foreground">Company not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link href="/companies">
          <span className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 mb-4 cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Back to Companies
          </span>
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
            <div className="flex gap-4 mt-2 text-muted-foreground text-sm">
              <span className="flex items-center gap-1 capitalize">{company.industry || "No Industry"}</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {company.size || "Unknown Size"} employees</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Company Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground" />
                {company.domain ? (
                  <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {company.domain}
                  </a>
                ) : (
                  <span>No domain provided</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{company.phone || "No phone provided"}</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span>{company.address || "No address provided"}</span>
              </div>
              
              {company.notes && (
                <div className="pt-4 border-t mt-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Notes</p>
                  {company.notes}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {contacts?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts linked to this company.</p>
              ) : (
                <div className="space-y-3">
                  {contacts?.map(contact => (
                    <div key={contact.id} className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <Link href={`/contacts/${contact.id}`}>
                          <p className="font-medium hover:underline cursor-pointer">
                            {contact.firstName} {contact.lastName}
                          </p>
                        </Link>
                        <p className="text-xs text-muted-foreground">{contact.email} • {contact.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deals</CardTitle>
            </CardHeader>
            <CardContent>
              {deals?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deals linked to this company.</p>
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
        </div>
      </div>
    </div>
  );
}
