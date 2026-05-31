import { useState, useMemo, useCallback } from "react";
import { useGetDashboardStats, useListRentals, useGetRecentPayments, useListLeads } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { format } from "date-fns";
import { Activity, AlertTriangle, DollarSign, Users, Target, Building2, AlertCircle, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const CARD_ORDER_KEY = "dashboard-card-order";

type StatCardId =
  | "activeRentals"
  | "expiringSoon"
  | "openLeads"
  | "rentCollected"
  | "overduePayments"
  | "properties"
  | "totalRevenue"
  | "totalClients";

const DEFAULT_ORDER: StatCardId[] = [
  "activeRentals",
  "expiringSoon",
  "openLeads",
  "rentCollected",
  "overduePayments",
  "properties",
  "totalRevenue",
  "totalClients",
];

function loadOrder(): StatCardId[] {
  try {
    const stored = localStorage.getItem(CARD_ORDER_KEY);
    if (!stored) return DEFAULT_ORDER;
    const parsed = JSON.parse(stored) as StatCardId[];
    if (Array.isArray(parsed) && parsed.length === DEFAULT_ORDER.length) return parsed;
  } catch {}
  return DEFAULT_ORDER;
}

interface SortableStatCardProps {
  id: StatCardId;
  children: React.ReactNode;
}

function SortableStatCard({ id, children }: SortableStatCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground z-10"
        title="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [cardOrder, setCardOrder] = useState<StatCardId[]>(loadOrder);

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: expiringRentals, isLoading: expiringLoading } = useListRentals({ expiringSoon: true });
  const { data: recentPayments, isLoading: paymentsLoading } = useGetRecentPayments();
  const { data: leads, isLoading: leadsLoading } = useListLeads({});

  const openLeads = leads?.filter((l) => l.stage !== "converted") || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCardOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as StatCardId);
        const newIndex = prev.indexOf(over.id as StatCardId);
        const next = arrayMove(prev, oldIndex, newIndex);
        localStorage.setItem(CARD_ORDER_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, []);

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case "contacted": return <Badge variant="outline" className="bg-blue-100 text-blue-800">Contacted</Badge>;
      case "agreement_sent": return <Badge variant="outline" className="bg-purple-100 text-purple-800">Agreement Sent</Badge>;
      case "term_selected": return <Badge variant="outline" className="bg-orange-100 text-orange-800">Quoted</Badge>;
      case "application_sent": return <Badge variant="outline" className="bg-amber-100 text-amber-800">Application Sent</Badge>;
      case "converted": return <Badge variant="outline" className="bg-green-100 text-green-800">Converted</Badge>;
      default: return <Badge>{stage}</Badge>;
    }
  };

  const statCards: Record<StatCardId, React.ReactNode> = useMemo(() => ({
    activeRentals: (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-8">
          <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.activeRentals || 0}</div>
        </CardContent>
      </Card>
    ),
    expiringSoon: (
      <Card className="border-yellow-300/60 bg-yellow-50/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-8">
          <CardTitle className="text-sm font-medium text-yellow-700">Expiring Soon</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{statsLoading ? "-" : stats?.expiringSoon || 0}</div>
        </CardContent>
      </Card>
    ),
    openLeads: (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-8">
          <CardTitle className="text-sm font-medium">Open Leads</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.openLeads || 0}</div>
        </CardContent>
      </Card>
    ),
    rentCollected: (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-8">
          <CardTitle className="text-sm font-medium">Rent Collected This Month</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${statsLoading ? "-" : (stats?.rentCollectedThisMonth || 0).toFixed(2)}</div>
        </CardContent>
      </Card>
    ),
    overduePayments: (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-8">
          <CardTitle className="text-sm font-medium text-destructive">Overdue Payments</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{statsLoading ? "-" : stats?.overduePayments || 0}</div>
        </CardContent>
      </Card>
    ),
    properties: (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-8">
          <CardTitle className="text-sm font-medium">Properties</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.totalProperties || 0}</div>
        </CardContent>
      </Card>
    ),
    totalRevenue: (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-8">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${statsLoading ? "-" : (stats?.totalRevenue || 0).toFixed(2)}</div>
        </CardContent>
      </Card>
    ),
    totalClients: (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-8">
          <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.totalClients || 0}</div>
        </CardContent>
      </Card>
    ),
  }), [stats, statsLoading]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cardOrder.map((id) => (
              <SortableStatCard key={id} id={id}>
                {statCards[id]}
              </SortableStatCard>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Expiring Soon</CardTitle>
            <CardDescription>Rentals expiring within 60 days</CardDescription>
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
                  {expiringRentals.map((rental) => (
                    <TableRow key={rental.id}>
                      <TableCell className="font-medium">
                        <Link href={`/clients/${rental.clientId}`} className="hover:underline text-primary">
                          {rental.clientName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{rental.unitDescription}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
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
                  {openLeads.slice(0, 5).map((lead) => (
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
                  {recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-sm">
                        {payment.paymentDate ? format(new Date(payment.paymentDate), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/clients/${payment.clientId}`} className="hover:underline text-primary">
                          {payment.clientName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={payment.status === "COMPLETED" ? "bg-green-100 text-green-800" : ""}
                        >
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
