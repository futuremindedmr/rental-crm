import { useState, useMemo } from "react";
import { useListSquarePayments, useListManualPayments, useCreateManualPayment, useListClients } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { PlusCircle } from "lucide-react";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  check: "Check",
  zelle: "Zelle",
  venmo: "Venmo",
  bank_transfer: "Bank Transfer",
};

const logPaymentSchema = z.object({
  clientId: z.coerce.number().min(1, "Client is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentDate: z.string().min(1, "Date is required"),
  paymentMethod: z.enum(["cash", "check", "zelle", "venmo", "bank_transfer"]),
  notes: z.string().optional(),
});

type LogPaymentForm = z.infer<typeof logPaymentSchema>;

function statusVariant(status: string): "default" | "secondary" | "outline" {
  const s = status.toLowerCase();
  if (s === "completed" || s === "approved" || s === "paid") return "default";
  if (s === "failed" || s === "canceled") return "outline";
  return "secondary";
}

export default function Payments() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: squarePayments, isLoading: squareLoading } = useListSquarePayments();
  const { data: manualPayments, isLoading: manualLoading } = useListManualPayments();
  const { data: clients } = useListClients({});
  const createManualPayment = useCreateManualPayment();

  const form = useForm<LogPaymentForm>({
    resolver: zodResolver(logPaymentSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "cash",
      notes: "",
    },
  });

  const onSubmit = (data: LogPaymentForm) => {
    createManualPayment.mutate(
      { data: { ...data, notes: data.notes || null } },
      {
        onSuccess: () => {
          setDialogOpen(false);
          form.reset({
            paymentDate: new Date().toISOString().split("T")[0],
            paymentMethod: "cash",
            notes: "",
          });
        },
      },
    );
  };

  type Row =
    | { kind: "square"; id: number; clientName: string | null; date: string; label: string; amount: number; status: string }
    | { kind: "manual"; id: number; clientName: string | null; date: string; label: string; amount: number; notes: string | null };

  const allRows: Row[] = useMemo(() => {
    const sq: Row[] = (squarePayments ?? []).map((p) => ({
      kind: "square",
      id: p.id,
      clientName: p.clientName ?? null,
      date: p.paymentDate ?? "",
      label: p.description ?? "Square",
      amount: p.amount,
      status: p.status,
    }));
    const mn: Row[] = (manualPayments ?? []).map((p) => ({
      kind: "manual",
      id: p.id,
      clientName: p.clientName ?? null,
      date: p.paymentDate ?? "",
      label: METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod,
      amount: p.amount,
      notes: p.notes ?? null,
    }));
    return [...sq, ...mn].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  }, [squarePayments, manualPayments]);

  const isLoading = squareLoading || manualLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">All payments — manual and Square.</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Log Manual Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Manual Payment</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="zelle">Zelle</SelectItem>
                          <SelectItem value="venmo">Venmo</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Check #1042, month of June" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={createManualPayment.isPending}>
                    {createManualPayment.isPending ? "Saving..." : "Log Payment"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Description / Method</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : allRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No payments yet. Log a manual payment or sync with Square.
                </TableCell>
              </TableRow>
            ) : (
              allRows.map((row) => (
                <TableRow key={`${row.kind}-${row.id}`}>
                  <TableCell className="font-medium">{row.clientName ?? "—"}</TableCell>
                  <TableCell>{row.label}</TableCell>
                  <TableCell>
                    {row.date ? format(new Date(row.date), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    {row.kind === "square" ? (
                      <Badge variant={statusVariant(row.status)} className="text-xs">
                        Square
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                        Manual
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                    {row.kind === "manual" ? (row.notes || "—") : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${row.amount.toFixed(2)}
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
