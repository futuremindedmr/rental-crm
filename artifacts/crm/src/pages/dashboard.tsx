import { useGetDashboardStats, useListRentals, useGetRecentPayments, useListLeads } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { format } from "date-fns";
import { Activity, AlertTriangle, DollarSign, Users, Target, Building2, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();

  const { data: expiringRentals, isLoading: expiringLoading } = useListRentals({ expiringSoon: true });
  const { data: recentPayments, isLoading: paymentsLoading } = useGetRecentPayments();
  const { data: leads, isLoading: leadsLoading } = useListLeads({});
  
  const openLeads = leads?.filter(l => l.stage !== 'converted') || [];

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case "contacted": return <Badge variant="outline" className="bg-blue-100 text-blue-800">Contacted</Badge>;
      case "agreement_sent": return <Badge variant="outline" className="bg-purple-100 text-purple-800">Agreement Sent</Badge>;
      case "term_selected": return <Badge variant="outline" className="bg-orange-100 text-orange-800">Term Selected</Badge>;
      case "converted": return <Badge variant="outline" className="bg-green-100 text-green-800">Converted</Badge>;
      default: return <Badge>{stage}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.activeRentals || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-accent/50 bg-accent/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-accent-foreground">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{statsLoading ? "-" : stats?.expiringSoon || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.openLeads || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rent Collected This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${statsLoading ? "-" : (stats?.rentCollectedThisMonth || 0).toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Overdue Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{statsLoading ? "-" : stats?.overduePayments || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.totalProperties || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${statsLoading ? "-" : (stats?.totalRevenue || 0).toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.totalClients || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Expiring Soon</CardTitle>
            <CardDescription>Rentals expiring in 2 months or less</CardDescription>
          </CardHeader>
          <CardContent>
            {expiringLoading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
            ) : !expiringRentals || expiringRentals.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center border rounded-md border-dashed">
                No rentals expiring soon.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiringRentals.map(rental => (
                    <TableRow key={rental.id}>
                      <TableCell className="font-medium">
                        <Link href={`/clients/${rental.clientId}`} className="hover:underline text-primary">
                          {rental.clientName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{rental.unitDescription}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                          {rental.monthsRemaining} mo
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Open Leads</CardTitle>
            <CardDescription>Pipeline opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
            ) : openLeads.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center border rounded-md border-dashed">
                No open leads. Add one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openLeads.slice(0, 5).map(lead => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        <Link href={`/clients/${lead.clientId}`} className="hover:underline text-primary">
                          {lead.clientName}
                        </Link>
                      </TableCell>
                      <TableCell>{getStageBadge(lead.stage)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                        {lead.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {openLeads.length > 5 && (
              <div className="mt-4 text-center">
                <Link href="/leads" className="text-sm text-primary hover:underline">
                  View all {openLeads.length} leads
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest transactions from Square</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
            ) : !recentPayments || recentPayments.length === 0 ? (
              <div className="text-sm text-muted-foreground py-12 text-center border rounded-md border-dashed">
                <DollarSign className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                No payments yet — connect Square to sync
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-sm">
                        {payment.paymentDate ? format(new Date(payment.paymentDate), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/clients/${payment.clientId}`} className="hover:underline text-primary">
                          {payment.clientName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={payment.status === 'COMPLETED' ? "bg-green-100 text-green-800" : ""}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(payment.amount / 100).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}