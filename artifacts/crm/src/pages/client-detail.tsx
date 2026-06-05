import { useState } from "react";
import {
  useGetClient,
  useUpdateClient,
  useDeleteClient,
  useListRentals,
  useCreateRental,
  useUpdateRental,
  useDeleteRental,
  useListAgreements,
  useCreateAgreement,
  useDeleteAgreement,
  useListManualPayments,
  useCreateManualPayment,
  useDeleteManualPayment,
  useListActivityLogs,
  useCreateActivityLog,
  useDeleteActivityLog,
  getGetClientQueryKey,
  getListRentalsQueryKey,
  getListAgreementsQueryKey,
  getListManualPaymentsQueryKey,
  getListActivityLogsQueryKey,
  type Rental,
} from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowLeft, Edit, Trash2, Download, Eye, FileText, Plus, Star, Phone, MessageSquare, Mail, MapPin, Clock, Activity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ObjectUploader } from "@workspace/object-storage-web";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  check: "Check",
  zelle: "Zelle",
  venmo: "Venmo",
  bank_transfer: "Bank Transfer",
  square: "Square",
};

const editClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  status: z.enum(["lead", "active_renter", "past_customer"]),
});

const rentalFormSchema = z.object({
  unitDescription: z.string().min(1, "Unit description is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().or(z.literal("")),
  termMonths: z.coerce.number().min(1, "Term is required"),
  monthlyRate: z.coerce.number().min(0, "Rate must be positive"),
  machineCode: z.string().optional().or(z.literal("")),
  brand: z.string().optional().or(z.literal("")),
  costOfMachine: z.string().optional().or(z.literal("")),
  paidOff: z.boolean().optional(),
  conditionScore: z.number().min(1).max(5).nullable().optional(),
  machineStatus: z.enum(["installed", "in_storage"]).optional(),
});

const paymentFormSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentDate: z.string().min(1, "Date is required"),
  paymentMethod: z.enum(["cash", "check", "zelle", "venmo", "bank_transfer", "square"]),
  notes: z.string().optional(),
});

function statusBadge(status: string) {
  switch (status) {
    case "lead":
      return <Badge variant="secondary" className="bg-slate-200 text-slate-800">Lead</Badge>;
    case "active_renter":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Active Renter</Badge>;
    case "past_customer":
      return <Badge variant="secondary" className="bg-gray-200 text-gray-800">Past Customer</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default function ClientDetail() {
  const [, params] = useRoute("/clients/:id");
  const [, setLocation] = useLocation();
  const clientId = Number(params?.id);
  const queryClient = useQueryClient();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rentalDialogOpen, setRentalDialogOpen] = useState(false);
  const [editRentalDialogOpen, setEditRentalDialogOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityType, setActivityType] = useState<"Call" | "Text" | "Email" | "Visit">("Call");
  const [activityNotes, setActivityNotes] = useState("");
  const [activityOccurredAt, setActivityOccurredAt] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
  });

  const { data: client, isLoading: clientLoading } = useGetClient(clientId, {
    query: { enabled: !!clientId, queryKey: getGetClientQueryKey(clientId) },
  });
  const { data: rentals, isLoading: rentalsLoading } = useListRentals(
    { clientId },
    { query: { enabled: !!clientId, queryKey: getListRentalsQueryKey({ clientId }) } },
  );
  const { data: agreements, isLoading: agreementsLoading } = useListAgreements(clientId, {
    query: { enabled: !!clientId, queryKey: getListAgreementsQueryKey(clientId) },
  });
  const { data: manualPayments, isLoading: paymentsLoading } = useListManualPayments(
    { clientId },
    { query: { enabled: !!clientId, queryKey: getListManualPaymentsQueryKey({ clientId }) } },
  );
  const { data: activityLogs, isLoading: activityLogsLoading } = useListActivityLogs(clientId, {
    query: { enabled: !!clientId, queryKey: getListActivityLogsQueryKey(clientId) },
  });

  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();
  const createRentalMutation = useCreateRental();
  const updateRentalMutation = useUpdateRental();
  const deleteRentalMutation = useDeleteRental();
  const createAgreementMutation = useCreateAgreement();
  const deleteAgreementMutation = useDeleteAgreement();
  const createPaymentMutation = useCreateManualPayment();
  const deletePaymentMutation = useDeleteManualPayment();
  const createActivityLogMutation = useCreateActivityLog();
  const deleteActivityLogMutation = useDeleteActivityLog();

  const editForm = useForm<z.infer<typeof editClientSchema>>({
    resolver: zodResolver(editClientSchema),
    values: {
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      address: client?.address || "",
      status: (client?.status as z.infer<typeof editClientSchema>["status"]) || "lead",
    },
  });

  const rentalForm = useForm<z.infer<typeof rentalFormSchema>>({
    resolver: zodResolver(rentalFormSchema),
    defaultValues: {
      unitDescription: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      termMonths: 12,
      monthlyRate: 0,
      machineCode: "",
      brand: "",
      costOfMachine: "",
      paidOff: false,
      conditionScore: null,
      machineStatus: "installed",
    },
  });

  const editRentalForm = useForm<z.infer<typeof rentalFormSchema>>({
    resolver: zodResolver(rentalFormSchema),
    defaultValues: {
      unitDescription: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      termMonths: 12,
      monthlyRate: 0,
      machineCode: "",
      brand: "",
      costOfMachine: "",
      paidOff: false,
      conditionScore: null,
      machineStatus: "installed",
    },
  });

  const paymentForm = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: 0,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "cash",
      notes: "",
    },
  });

  if (!clientId || clientLoading) {
    return <div className="p-8 text-muted-foreground">Loading client...</div>;
  }

  if (!client) {
    return <div className="p-8 text-muted-foreground">Client not found.</div>;
  }

  const onEditSubmit = (data: z.infer<typeof editClientSchema>) => {
    updateClientMutation.mutate(
      { id: clientId, data },
      {
        onSuccess: () => {
          setEditDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
        },
      },
    );
  };

  const onDeleteClient = () => {
    deleteClientMutation.mutate(
      { id: clientId },
      { onSuccess: () => setLocation("/clients") },
    );
  };

  const onRentalSubmit = (data: z.infer<typeof rentalFormSchema>) => {
    const costOfMachine = data.costOfMachine ? Number(data.costOfMachine) : undefined;
    createRentalMutation.mutate(
      {
        data: {
          ...data,
          clientId,
          startDate: new Date(data.startDate).toISOString(),
          endDate: data.endDate ? data.endDate + "-01" : undefined,
          machineCode: data.machineCode || undefined,
          brand: data.brand || undefined,
          costOfMachine: !isNaN(costOfMachine as number) ? costOfMachine : undefined,
          paidOff: data.paidOff,
          conditionScore: data.conditionScore ?? undefined,
          machineStatus: data.machineStatus,
        },
      },
      {
        onSuccess: () => {
          setRentalDialogOpen(false);
          rentalForm.reset();
          queryClient.invalidateQueries({ queryKey: getListRentalsQueryKey({ clientId }) });
        },
      },
    );
  };

  const onEditRentalSubmit = (data: z.infer<typeof rentalFormSchema>) => {
    if (!editingRental) return;
    const costOfMachine = data.costOfMachine ? Number(data.costOfMachine) : null;
    updateRentalMutation.mutate(
      {
        id: editingRental.id,
        data: {
          unitDescription: data.unitDescription,
          startDate: new Date(data.startDate).toISOString(),
          endDate: data.endDate ? data.endDate + "-01" : null,
          termMonths: data.termMonths,
          monthlyRate: data.monthlyRate,
          machineCode: data.machineCode || null,
          brand: data.brand || null,
          costOfMachine: data.costOfMachine && !isNaN(costOfMachine as number) ? (costOfMachine as number) : null,
          paidOff: data.paidOff ?? null,
          conditionScore: data.conditionScore ?? null,
          machineStatus: data.machineStatus ?? null,
        },
      },
      {
        onSuccess: () => {
          setEditRentalDialogOpen(false);
          setEditingRental(null);
          queryClient.invalidateQueries({ queryKey: getListRentalsQueryKey({ clientId }) });
        },
      },
    );
  };

  const openEditRental = (rental: Rental) => {
    setEditingRental(rental);
    editRentalForm.reset({
      unitDescription: rental.unitDescription ?? "",
      startDate: rental.startDate ? new Date(rental.startDate).toISOString().split("T")[0] : "",
      endDate: rental.endDate ? rental.endDate.substring(0, 7) : "",
      termMonths: rental.termMonths,
      monthlyRate: rental.monthlyRate ?? 0,
      machineCode: rental.machineCode ?? "",
      brand: rental.brand ?? "",
      costOfMachine: rental.costOfMachine != null ? String(rental.costOfMachine) : "",
      paidOff: rental.paidOff ?? false,
      conditionScore: rental.conditionScore ?? null,
      machineStatus: (rental.machineStatus as "installed" | "in_storage") ?? "installed",
    });
    setEditRentalDialogOpen(true);
  };

  const onPaymentSubmit = (data: z.infer<typeof paymentFormSchema>) => {
    createPaymentMutation.mutate(
      { data: { clientId, amount: data.amount, paymentDate: data.paymentDate, paymentMethod: data.paymentMethod, notes: data.notes || null } },
      {
        onSuccess: () => {
          setPaymentDialogOpen(false);
          paymentForm.reset({
            amount: 0,
            paymentDate: new Date().toISOString().split("T")[0],
            paymentMethod: "cash",
            notes: "",
          });
          queryClient.invalidateQueries({ queryKey: getListManualPaymentsQueryKey({ clientId }) });
          queryClient.invalidateQueries({ queryKey: getListManualPaymentsQueryKey() });
        },
      },
    );
  };

  const sortedPayments = [...(manualPayments ?? [])].sort((a, b) => {
    const da = a.paymentDate ?? "";
    const db = b.paymentDate ?? "";
    return db > da ? 1 : db < da ? -1 : 0;
  });

  const sortedActivity = [...(activityLogs ?? [])].sort((a, b) => {
    const da = a.occurredAt ?? "";
    const db = b.occurredAt ?? "";
    return db > da ? 1 : db < da ? -1 : 0;
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/clients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
        {statusBadge(client.status)}
        <div className="ml-auto">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" /> Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Client</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={editForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="active_renter">Active Renter</SelectItem>
                            <SelectItem value="past_customer">Past Customer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={editForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="address" render={({ field }) => (
                      <FormItem className="col-span-2"><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={updateClientMutation.isPending}>Save</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Contact section ────────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-lg font-medium">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <div>
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</div>
              <div className="mt-1">{client.email || "—"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone</div>
              <div className="mt-1">{client.phone || "—"}</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Address</div>
              <div className="mt-1">{client.address || "—"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <Tabs defaultValue="rentals" className="w-full">
        <TabsList>
          <TabsTrigger value="rentals">Rentals</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ── Rentals tab ──────────────────────────────────────── */}
        <TabsContent value="rentals" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
              <CardTitle className="text-lg">Rentals</CardTitle>
              <Dialog open={rentalDialogOpen} onOpenChange={setRentalDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Rental</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Rental</DialogTitle></DialogHeader>
                  <Form {...rentalForm}>
                    <form onSubmit={rentalForm.handleSubmit(onRentalSubmit)} className="space-y-4">
                      <FormField control={rentalForm.control} name="unitDescription" render={({ field }) => (
                        <FormItem><FormLabel>Unit Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={rentalForm.control} name="startDate" render={({ field }) => (
                        <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={rentalForm.control} name="endDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                          <FormControl><Input type="month" {...field} /></FormControl>
                          <p className="text-xs text-muted-foreground">Leave blank for month-to-month.</p>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={rentalForm.control} name="termMonths" render={({ field }) => (
                          <FormItem><FormLabel>Term (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={rentalForm.control} name="monthlyRate" render={({ field }) => (
                          <FormItem><FormLabel>Monthly Rate ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium text-muted-foreground mb-3">Machine Details (optional)</p>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={rentalForm.control} name="machineCode" render={({ field }) => (
                            <FormItem><FormLabel>Machine Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={rentalForm.control} name="brand" render={({ field }) => (
                            <FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={rentalForm.control} name="costOfMachine" render={({ field }) => (
                            <FormItem><FormLabel>Cost of Machine ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={rentalForm.control} name="paidOff" render={({ field }) => (
                            <FormItem className="flex flex-row items-end gap-3 pb-1">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="cursor-pointer">Paid Off</FormLabel>
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={rentalForm.control} name="conditionScore" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Condition</FormLabel>
                            <FormControl>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <button key={n} type="button" onClick={() => field.onChange(field.value === n ? null : n)}>
                                    <Star className={`h-6 w-6 transition-colors ${n <= (field.value ?? 0) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"}`} />
                                  </button>
                                ))}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={rentalForm.control} name="machineStatus" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="installed">Installed</SelectItem>
                                <SelectItem value="in_storage">In Storage</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={createRentalMutation.isPending}>Add Rental</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              {rentalsLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading rentals...</div>
              ) : !rentals?.length ? (
                <div className="p-12 text-center text-muted-foreground border-dashed border-t m-4 rounded-md">
                  No rentals for this client.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6">Machine Code</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Monthly Rate</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rentals.map((rental) => (
                      <TableRow key={rental.id}>
                        <TableCell className="px-6 font-medium">{rental.machineCode || "—"}</TableCell>
                        <TableCell>{rental.brand || "—"}</TableCell>
                        <TableCell>{rental.startDate ? format(new Date(rental.startDate), "MMM d, yyyy") : "—"}</TableCell>
                        <TableCell>{rental.endDate ? format(new Date(rental.endDate), "MMM yyyy") : "—"}</TableCell>
                        <TableCell>
                          {!rental.endDate ? (
                            <span className="text-muted-foreground">Month-to-month</span>
                          ) : rental.monthsRemaining == null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : rental.monthsRemaining <= 2 ? (
                            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">{rental.monthsRemaining} mo</Badge>
                          ) : (
                            <span>{rental.monthsRemaining} mo</span>
                          )}
                        </TableCell>
                        <TableCell>${rental.monthlyRate?.toFixed(2)}/mo</TableCell>
                        <TableCell>
                          {rental.paymentStatus ? (
                            <Badge variant="outline" className="capitalize">{rental.paymentStatus}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditRental(rental)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this rental?")) {
                                deleteRentalMutation.mutate(
                                  { id: rental.id },
                                  { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListRentalsQueryKey({ clientId }) }) },
                                );
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Files tab ────────────────────────────────────────── */}
        <TabsContent value="files" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
              <CardTitle className="text-lg">Files</CardTitle>
              <ObjectUploader
                maxFileSize={15 * 1024 * 1024}
                onGetUploadParameters={async (file) => {
                  const res = await fetch("/api/storage/uploads/request-url", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
                  });
                  const { uploadURL } = await res.json();
                  return { method: "PUT", url: uploadURL, headers: { "Content-Type": file.type } };
                }}
                onComplete={(result) => {
                  const objectPath = result.successful?.[0]?.response?.body?.objectPath as
                    | string
                    | undefined;
                  const fileName = result.successful?.[0]?.name;
                  if (objectPath && fileName) {
                    createAgreementMutation.mutate(
                      { clientId, data: { objectPath, fileName } },
                      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAgreementsQueryKey(clientId) }) },
                    );
                  }
                }}
              >
                Upload File
              </ObjectUploader>
            </CardHeader>
            <CardContent className="p-0">
              {agreementsLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading files...</div>
              ) : !agreements?.length ? (
                <div className="p-12 text-center text-muted-foreground border-dashed border-t m-4 rounded-md">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  No files uploaded yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6">File Name</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agreements.map((agreement) => {
                      const fileUrl = `/api/storage/objects/${encodeURIComponent(agreement.objectPath)}`;
                      return (
                        <TableRow key={agreement.id}>
                          <TableCell className="px-6 font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {agreement.fileName}
                          </TableCell>
                          <TableCell>{agreement.createdAt ? format(new Date(agreement.createdAt), "MMM d, yyyy") : "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4 mr-1.5" /> View
                              </a>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
                                <Download className="h-4 w-4 mr-1.5" /> Download
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this file?")) {
                                  deleteAgreementMutation.mutate(
                                    { clientId, id: agreement.id },
                                    { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAgreementsQueryKey(clientId) }) },
                                  );
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payments tab ─────────────────────────────────────── */}
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
              <CardTitle className="text-lg">Payments</CardTitle>
              <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Log Payment</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Log Payment</DialogTitle></DialogHeader>
                  <Form {...paymentForm}>
                    <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={paymentForm.control} name="amount" render={({ field }) => (
                          <FormItem><FormLabel>Amount ($)</FormLabel><FormControl><Input type="number" step="0.01" min="0" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={paymentForm.control} name="paymentDate" render={({ field }) => (
                          <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <FormField control={paymentForm.control} name="paymentMethod" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                      )} />
                      <FormField control={paymentForm.control} name="notes" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                          <FormControl><Input placeholder="e.g. Check #1042, month of June" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={createPaymentMutation.isPending}>
                          {createPaymentMutation.isPending ? "Saving..." : "Log Payment"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              {paymentsLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading payments...</div>
              ) : !sortedPayments.length ? (
                <div className="p-12 text-center text-muted-foreground border-dashed border-t m-4 rounded-md">
                  No payments logged for this client.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6">Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="px-6">{payment.paymentDate ? format(new Date(payment.paymentDate), "MMM d, yyyy") : "—"}</TableCell>
                        <TableCell className="font-medium">${Number(payment.amount).toFixed(2)}</TableCell>
                        <TableCell>{METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}</TableCell>
                        <TableCell className="text-muted-foreground">{payment.notes || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this payment?")) {
                                deletePaymentMutation.mutate(
                                  { id: payment.id },
                                  {
                                    onSuccess: () => {
                                      queryClient.invalidateQueries({ queryKey: getListManualPaymentsQueryKey({ clientId }) });
                                      queryClient.invalidateQueries({ queryKey: getListManualPaymentsQueryKey() });
                                    },
                                  },
                                );
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Activity tab ─────────────────────────────────────── */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
              <CardTitle className="text-lg">Activity</CardTitle>
              {!showActivityForm && (
                <Button
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    now.setSeconds(0, 0);
                    setActivityOccurredAt(now.toISOString().slice(0, 16));
                    setActivityType("Call");
                    setActivityNotes("");
                    setShowActivityForm(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Activity
                </Button>
              )}
            </CardHeader>

            {showActivityForm && (
              <div className="border-b px-6 py-5 bg-muted/20 space-y-4">
                <p className="text-sm font-medium">New entry</p>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Type</label>
                  <div className="flex gap-2 flex-wrap">
                    {(["Call", "Text", "Email", "Visit"] as const).map((t) => {
                      const icons = { Call: Phone, Text: MessageSquare, Email: Mail, Visit: MapPin };
                      const Icon = icons[t];
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setActivityType(t)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                            activityType === t ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Date &amp; Time</label>
                  <Input type="datetime-local" value={activityOccurredAt} onChange={(e) => setActivityOccurredAt(e.target.value)} className="max-w-xs" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <textarea
                    value={activityNotes}
                    onChange={(e) => setActivityNotes(e.target.value)}
                    placeholder="What happened? Any follow-up needed?"
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={createActivityLogMutation.isPending || !activityOccurredAt}
                    onClick={() => {
                      const localDt = new Date(activityOccurredAt);
                      createActivityLogMutation.mutate(
                        { id: clientId, data: { type: activityType, notes: activityNotes || null, occurredAt: localDt.toISOString() } },
                        {
                          onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: getListActivityLogsQueryKey(clientId) });
                            setShowActivityForm(false);
                            setActivityNotes("");
                          },
                        },
                      );
                    }}
                  >
                    {createActivityLogMutation.isPending ? "Saving…" : "Save entry"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowActivityForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <CardContent className="p-0">
              {activityLogsLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading activity…</div>
              ) : !sortedActivity.length ? (
                <div className="p-12 text-center text-muted-foreground border-dashed border-t m-4 rounded-md">
                  <Activity className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  No interactions logged yet.
                </div>
              ) : (
                <div className="divide-y">
                  {sortedActivity.map((log) => {
                    const typeConfig: Record<string, { icon: React.ElementType; className: string }> = {
                      Call: { icon: Phone, className: "bg-blue-100 text-blue-800" },
                      Text: { icon: MessageSquare, className: "bg-purple-100 text-purple-800" },
                      Email: { icon: Mail, className: "bg-amber-100 text-amber-800" },
                      Visit: { icon: MapPin, className: "bg-green-100 text-green-800" },
                    };
                    const cfg = typeConfig[log.type] ?? { icon: Activity, className: "bg-muted text-muted-foreground" };
                    const Icon = cfg.icon;
                    return (
                      <div key={log.id} className="flex items-start gap-4 px-6 py-4 group hover:bg-muted/30">
                        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shrink-0 mt-0.5 ${cfg.className}`}>
                          <Icon className="h-3 w-3" />
                          {log.type}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Clock className="h-3 w-3" />
                            {log.occurredAt ? format(new Date(log.occurredAt), "MMM d, yyyy 'at' h:mm a") : "—"}
                          </div>
                          {log.notes ? (
                            <p className="text-sm whitespace-pre-wrap">{log.notes}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No notes</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => {
                            if (confirm("Delete this activity log entry?")) {
                              deleteActivityLogMutation.mutate(
                                { id: clientId, logId: log.id },
                                { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListActivityLogsQueryKey(clientId) }) },
                              );
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Edit rental dialog ─────────────────────────────────── */}
      <Dialog open={editRentalDialogOpen} onOpenChange={setEditRentalDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Rental</DialogTitle></DialogHeader>
          <Form {...editRentalForm}>
            <form onSubmit={editRentalForm.handleSubmit(onEditRentalSubmit)} className="space-y-4">
              <FormField control={editRentalForm.control} name="unitDescription" render={({ field }) => (
                <FormItem><FormLabel>Unit Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editRentalForm.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editRentalForm.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl><Input type="month" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">Leave blank for month-to-month.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editRentalForm.control} name="termMonths" render={({ field }) => (
                  <FormItem><FormLabel>Term (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editRentalForm.control} name="monthlyRate" render={({ field }) => (
                  <FormItem><FormLabel>Monthly Rate ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">Machine Details (optional)</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={editRentalForm.control} name="machineCode" render={({ field }) => (
                    <FormItem><FormLabel>Machine Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={editRentalForm.control} name="brand" render={({ field }) => (
                    <FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={editRentalForm.control} name="costOfMachine" render={({ field }) => (
                    <FormItem><FormLabel>Cost of Machine ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={editRentalForm.control} name="paidOff" render={({ field }) => (
                    <FormItem className="flex flex-row items-end gap-3 pb-1">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="cursor-pointer">Paid Off</FormLabel>
                    </FormItem>
                  )} />
                </div>
                <FormField control={editRentalForm.control} name="conditionScore" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition</FormLabel>
                    <FormControl>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" onClick={() => field.onChange(field.value === n ? null : n)}>
                            <Star className={`h-6 w-6 transition-colors ${n <= (field.value ?? 0) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"}`} />
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editRentalForm.control} name="machineStatus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="installed">Installed</SelectItem>
                        <SelectItem value="in_storage">In Storage</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={updateRentalMutation.isPending}>Save Changes</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Delete client ──────────────────────────────────────── */}
      <div className="pt-12 border-t mt-12 flex justify-end">
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">Delete Client</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              This action cannot be undone. This will permanently delete <strong>{client.name}</strong> and remove all associated data, including rentals and payment history.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={onDeleteClient} disabled={deleteClientMutation.isPending}>
                {deleteClientMutation.isPending ? "Deleting..." : "Yes, delete client"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
