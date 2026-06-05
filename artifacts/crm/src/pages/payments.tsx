import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListSquarePayments, useListManualPayments, useCreateManualPayment, useUpdateManualPayment, useDeleteManualPayment, useListClients, getListManualPaymentsQueryKey } from "@workspace/api-client-react";
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
import { safeFormatDate, safeToFixed } from "@/lib/utils";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  check: "Check",
  zelle: "Zelle",
  venmo: "Venmo",
  bank_transfer: "Bank Transfer",
  square: "Square",
};

const paymentFormSchema = z.object({
  clientId: z.coerce.number().min(1, "Client is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentDate: z.string().min(1, "Date is required"),
  paymentMethod: z.enum(["cash", "check", "zelle", "venmo", "bank_transfer", "square"]),
  notes: z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentFormSchema>;

function emptyDefaults(): PaymentForm {
  return {
    clientId: 0,
    amount: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    notes: "",
  };
}

function statusVariant(status: string): "default" | "secondary" | "outline" {
  const s = status.toLowerCase();
  if (s === "completed" || s === "approved" || s === "paid") return "default";
  if (s === "failed" || s === "canceled") return "outline";
  return "secondary";
}

export default function Payments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const { data: squarePayments, isLoading: squareLoading } = useListSquarePayments();
  const { data: manualPayments, isLoading: manualLoading } = useListManualPayments();
  const { data: clients } = useListClients({});
  const createManualPayment = useCreateManualPayment();
  const updateManualPayment = useUpdateManualPayment();
  const deleteManualPayment = useDeleteManualPayment();

  function invalidateManualPayments(clientId?: number | null) {
    queryClient.invalidateQueries({ queryKey: getListManualPaymentsQueryKey() });
    if (clientId) {
      queryClient.invalidateQueries({ queryKey: getListManualPaymentsQueryKey({ clientId }) });
    }
  }

  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: emptyDefaults(),
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset(emptyDefaults());
    setDialogOpen(true);
  };

  const openEdit = (p: { id: number; clientId: number | null; amount: number; paymentDate: string; paymentMethod: string; notes: string | null }) => {
    setEditingId(p.id);
    form.reset({
      clientId: p.clientId ?? 0,
      amount: p.amount,
      paymentDate: p.paymentDate ? p.paymentDate.split("T")[0] : new Date().toISOString().split("T")[0],
      paymentMethod: (["cash", "check", "zelle", "venmo", "bank_transfer", "square"].includes(p.paymentMethod)
        ? p.paymentMethod
        : "cash") as PaymentForm["paymentMethod"],
      notes: p.notes ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: PaymentForm) => {
    const body = { ...data, notes: data.notes || null };
    if (editingId != null) {
      updateManualPayment.mutate(
        { id: editingId, data: body },
        {
          onSuccess: () => {
            invalidateManualPayments(data.clientId);
            setDialogOpen(false);
            setEditingId(null);
          },
        },
      );
    } else {
      createManualPayment.mutate(
        { data: body },
        {
          onSuccess: () => {
            invalidateManualPayments(data.clientId);
            setDialogOpen(false);
          },
        },
      );
    }
  };

  const onDelete = () => {
    if (editingId == null) return;
    const clientId = form.getValues("clientId");
    deleteManualPayment.mutate(
      { id: editingId },
      {
        onSuccess: () => {
          invalidateManualPayments(clientId);
          setDialogOpen(false);
          setEditingId(null);
        },
      },
    );
  };

  type Row =
    | { kind: "square"; id: number; clientName: string | null; date: string; label: string; amount: number; status: string }
    | { kind: "manual"; id: number; clientId: number | null; clientName: string | null; date: string; label: string; amount: number; method: string; notes: string | null };

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
      clientId: p.clientId ?? null,
      clientName: p.clientName ?? null,
      date: p.paymentDate ?? "",
      label: METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod,
      amount: p.amount,
      method: p.paymentMethod,
      notes: p.notes ?? null,
    }));
    return [...sq, ...mn].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  }, [squarePayments, manualPayments]);

  const isLoading = squareLoading || manualLoading;
  const isSaving = createManualPayment.isPending || updateManualPayment.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">All payments — manual and Square.</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingId(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate}>
              <PlusCircle className="h-4 w-4" />
              Log Manual Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId != null ? "Edit Manual Payment" : "Log Manual Payment"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : undefined}>
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
                          <SelectItem value="square">Square</SelectItem>
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

                <div className="flex justify-between items-center pt-2">
                  {editingId != null ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:text-destructive gap-2"
                      onClick={onDelete}
                      disabled={deleteManualPayment.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  ) : (
                    <span />
                  )}
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : editingId != null ? "Save Changes" : "Log Payment"}
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
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : allRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No payments yet. Log a manual payment or sync with Square.
                </TableCell>
              </TableRow>
            ) : (
              allRows.map((row) => (
                <TableRow key={`${row.kind}-${row.id}`}>
                  <TableCell className="font-medium">{row.clientName ?? "—"}</TableCell>
                  <TableCell>{row.label}</TableCell>
                  <TableCell>
                    {safeFormatDate(row.date, "MMM d, yyyy")}
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
                    ${safeToFixed(row.amount)}
                  </TableCell>
                  <TableCell>
                    {row.kind === "manual" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit({ id: row.id, clientId: row.clientId, amount: row.amount, paymentDate: row.date, paymentMethod: row.method, notes: row.notes })}
                        title="Edit payment"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
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
