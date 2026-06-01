import { useState, useMemo } from "react";
import { useListRentals, useCreateRental } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListClients } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type SortCol = "machine" | "renter" | "startDate" | "term" | "monthlyRate";
type SortDir = "asc" | "desc";

function SortableHead({
  label, col, current, dir, onClick, className,
}: {
  label: string; col: SortCol; current: SortCol; dir: SortDir;
  onClick: (col: SortCol) => void; className?: string;
}) {
  const active = col === current;
  return (
    <TableHead
      className={cn("cursor-pointer select-none whitespace-nowrap", className)}
      onClick={() => onClick(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? dir === "asc"
            ? <ChevronUp className="h-3.5 w-3.5 text-foreground" />
            : <ChevronDown className="h-3.5 w-3.5 text-foreground" />
          : <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />}
      </span>
    </TableHead>
  );
}

const newRentalSchema = z.object({
  clientId: z.coerce.number().min(1, "Client is required"),
  unitDescription: z.string().min(1, "Unit description is required"),
  startDate: z.string().min(1, "Start date is required"),
  termMonths: z.coerce.number().min(1, "Term is required"),
  endDate: z.string().optional(),
  monthlyRate: z.coerce.number().min(0, "Rate must be positive")
});

function PaymentStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  switch (status) {
    case "paid":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Paid</Badge>;
    case "late":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">Late</Badge>;
    case "overdue":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">Overdue</Badge>;
    default:
      return <span className="text-muted-foreground text-xs">—</span>;
  }
}

export default function Rentals() {
  const [filter, setFilter] = useState<"all" | "expiring" | "mtm">("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [sortCol, setSortCol] = useState<SortCol>("machine");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSort = (col: SortCol) => {
    if (col === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const { data: rentals, isLoading } = useListRentals({
    expiringSoon: filter === "expiring" ? true : undefined
  });

  const { data: clients } = useListClients({});

  const createRentalMutation = useCreateRental();

  const form = useForm<z.infer<typeof newRentalSchema>>({
    resolver: zodResolver(newRentalSchema),
    defaultValues: {
      unitDescription: "",
      startDate: new Date().toISOString().split('T')[0],
      termMonths: 12,
      monthlyRate: 0
    }
  });

  const onSubmit = (data: z.infer<typeof newRentalSchema>) => {
    const { endDate, ...rest } = data;
    createRentalMutation.mutate({
      data: {
        ...rest,
        startDate: new Date(data.startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      },
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        form.reset();
      }
    });
  };

  const filteredRentals = useMemo(() => {
    if (!rentals) return [];
    let list = rentals;
    if (filter === "mtm") list = list.filter((r) => r.isMonthToMonth);
    if (paymentFilter !== "all") list = list.filter((r) => r.paymentStatus === paymentFilter);

    const mul = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (sortCol) {
        case "machine": {
          const aKey = (a.machineCode ?? a.unitDescription ?? "").toLowerCase();
          const bKey = (b.machineCode ?? b.unitDescription ?? "").toLowerCase();
          return mul * aKey.localeCompare(bKey, undefined, { numeric: true, sensitivity: "base" });
        }
        case "renter":
          return mul * (a.clientName ?? "").localeCompare(b.clientName ?? "");
        case "startDate":
          return mul * (a.startDate ?? "").localeCompare(b.startDate ?? "");
        case "term":
          return mul * (a.termMonths - b.termMonths);
        case "monthlyRate":
          return mul * ((a.monthlyRate ?? 0) - (b.monthlyRate ?? 0));
        default:
          return 0;
      }
    });

    return list;
  }, [rentals, paymentFilter, filter, sortCol, sortDir]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Rentals</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>New Rental</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Rental</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="clientId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="unitDescription" render={({ field }) => (
                  <FormItem><FormLabel>Unit Description</FormLabel><FormControl><Input {...field} placeholder="e.g., SpeedQueen Washer Set A" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="termMonths" render={({ field }) => (
                    <FormItem><FormLabel>Term (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="monthlyRate" render={({ field }) => (
                    <FormItem><FormLabel>Monthly Rate ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">
                      Leave blank to use Start Date + Term. After this date the agreement continues month-to-month.
                    </p>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createRentalMutation.isPending}>
                    {createRentalMutation.isPending ? "Saving..." : "Create Rental"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "expiring" | "mtm")}>
          <TabsList>
            <TabsTrigger value="all">All Rentals</TabsTrigger>
            <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
            <TabsTrigger value="mtm">Month-to-Month</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Machine" col="machine" current={sortCol} dir={sortDir} onClick={handleSort} />
              <SortableHead label="Renter" col="renter" current={sortCol} dir={sortDir} onClick={handleSort} />
              <SortableHead label="Start Date" col="startDate" current={sortCol} dir={sortDir} onClick={handleSort} />
              <SortableHead label="Term" col="term" current={sortCol} dir={sortDir} onClick={handleSort} />
              <TableHead>Remaining</TableHead>
              <SortableHead label="Monthly Rent" col="monthlyRate" current={sortCol} dir={sortDir} onClick={handleSort} className="text-right" />
              <TableHead>Payment Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : filteredRentals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No rentals found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRentals.map((rental) => (
                <TableRow
                  key={rental.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    rental.isExpiringSoon && "bg-orange-50 hover:bg-orange-100/60"
                  )}
                  onClick={() => setLocation(`/clients/${rental.clientId}`)}
                >
                  <TableCell>
                    <div className="font-semibold">
                      {rental.machineCode || rental.brand
                        ? [rental.machineCode, rental.brand].filter(Boolean).join(" · ")
                        : rental.unitDescription || <span className="text-muted-foreground">—</span>}
                    </div>
                    {rental.machineCode && rental.brand && rental.unitDescription && (
                      <div className="text-xs text-muted-foreground">{rental.unitDescription}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{rental.clientName || "—"}</span>
                  </TableCell>
                  <TableCell>
                    {rental.startDate ? format(new Date(rental.startDate), 'MMM d, yyyy') : ''}
                  </TableCell>
                  <TableCell>{rental.termMonths} mo</TableCell>
                  <TableCell>
                    {rental.isMonthToMonth ? (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                        Month-to-Month
                      </Badge>
                    ) : rental.isExpiringSoon ? (
                      <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                        {rental.monthsRemaining} mo
                      </Badge>
                    ) : (
                      <span>{rental.monthsRemaining} mo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${rental.monthlyRate?.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={rental.paymentStatus} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {rental.notes || <span className="text-muted-foreground/50">—</span>}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
