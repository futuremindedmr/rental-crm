import { useState, useRef } from "react";
import { useListClients, useCreateClient, useListProperties, useImportClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Search, Download, Upload } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";

const newClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  propertyId: z.string().optional(),
  status: z.enum(["lead", "active_renter", "past_customer"])
});

type ImportRow = {
  renterName: string;
  email?: string;
  phone?: string;
  notes?: string;
  stage?: string;
  machineCode?: string;
  brand?: string;
  revenue?: number;
  costOfMachine?: number;
  paidOff?: boolean;
  termMonths?: number;
};

const CSV_COLUMN_MAP: Record<string, keyof ImportRow> = {
  "renter name": "renterName",
  "renter": "renterName",
  "name": "renterName",
  "email": "email",
  "phone": "phone",
  "notes": "notes",
  "stage": "stage",
  "machine code": "machineCode",
  "machinecode": "machineCode",
  "brand": "brand",
  "revenue": "revenue",
  "monthly rate": "revenue",
  "monthlyrate": "revenue",
  "rate": "revenue",
  "cost of machine": "costOfMachine",
  "costofmachine": "costOfMachine",
  "cost": "costOfMachine",
  "paid off": "paidOff",
  "paidoff": "paidOff",
  "term": "termMonths",
  "term months": "termMonths",
  "termmonths": "termMonths",
};

function mapCsvRow(record: Record<string, string>): ImportRow {
  const result: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(record)) {
    const mappedKey = CSV_COLUMN_MAP[rawKey.trim().toLowerCase()];
    if (!mappedKey || !value.trim()) continue;
    if (mappedKey === "revenue" || mappedKey === "costOfMachine" || mappedKey === "termMonths") {
      const n = parseFloat(value.replace(/[$,]/g, ""));
      if (!isNaN(n)) result[mappedKey] = mappedKey === "termMonths" ? Math.round(n) : n;
    } else if (mappedKey === "paidOff") {
      result[mappedKey] = /^(yes|true|1|y)$/i.test(value.trim());
    } else {
      result[mappedKey] = value.trim();
    }
  }
  return result as ImportRow;
}

export default function Clients() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: clients, isLoading } = useListClients({ 
    search: search || undefined, 
    status: statusFilter === "all" ? undefined : (statusFilter as any) 
  });

  const createClientMutation = useCreateClient();
  const importClientsMutation = useImportClients();
  const { data: properties } = useListProperties();

  const form = useForm<z.infer<typeof newClientSchema>>({
    resolver: zodResolver(newClientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      propertyId: "none",
      status: "lead"
    }
  });

  const onSubmit = (data: z.infer<typeof newClientSchema>) => {
    const { propertyId, ...rest } = data;
    createClientMutation.mutate(
      {
        data: {
          ...rest,
          propertyId: propertyId && propertyId !== "none" ? Number(propertyId) : null,
        },
      },
      {
        onSuccess: (client) => {
          setDialogOpen(false);
          form.reset();
          setLocation(`/clients/${client.id}`);
        },
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const mapped = result.data.map(mapCsvRow);
        setImportRows(mapped);
      },
    });
  };

  const handleImport = () => {
    if (!importRows.length) return;
    importClientsMutation.mutate(
      { data: { rows: importRows } },
      {
        onSuccess: (result) => {
          setImportDialogOpen(false);
          setImportRows([]);
          setImportFileName("");
          if (fileInputRef.current) fileInputRef.current.value = "";
          const parts = [`${result.clientsCreated} client${result.clientsCreated !== 1 ? "s" : ""} imported`];
          if (result.rentalsCreated > 0) parts.push(`${result.rentalsCreated} rental${result.rentalsCreated !== 1 ? "s" : ""} created`);
          if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
          toast({ title: "Import complete", description: parts.join(", ") + "." });
          if (result.errors.length > 0) {
            toast({ title: `${result.errors.length} row error${result.errors.length !== 1 ? "s" : ""}`, description: result.errors.slice(0, 3).join("; "), variant: "destructive" });
          }
        },
        onError: () => {
          toast({ title: "Import failed", description: "An error occurred during import.", variant: "destructive" });
        },
      }
    );
  };

  const handleExportCsv = () => {
    const headers = ["Name", "Status", "Phone", "Email", "Property", "Active Rentals", "Added"];
    const escape = (val: unknown) => {
      const s = val == null ? "" : String(val);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = (clients ?? []).map((c) => [
      c.name,
      c.status,
      c.phone ?? "",
      c.email ?? "",
      c.propertyName ?? "",
      c.activeRentalCount,
      c.createdAt ? format(new Date(c.createdAt), "yyyy-MM-dd") : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clients-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "lead": return <Badge variant="secondary" className="bg-slate-200 text-slate-800">Lead</Badge>;
      case "active_renter": return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Active Renter</Badge>;
      case "past_customer": return <Badge variant="secondary" className="bg-gray-200 text-gray-800">Past Customer</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const previewRows = importRows.slice(0, 50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCsv} disabled={!clients?.length}>
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>

          <Dialog open={importDialogOpen} onOpenChange={(open) => {
            setImportDialogOpen(open);
            if (!open) { setImportRows([]); setImportFileName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Clients from CSV</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload a CSV with any of these columns:{" "}
                  <span className="font-mono text-xs">Renter Name, Email, Phone, Stage, Machine Code, Brand, Revenue, Cost of Machine, Paid Off, Term, Notes</span>.
                  Rows with no Renter Name are skipped. Stage "Installed" → Active Renter, anything else → Lead.
                </p>

                <div className="flex items-center gap-3">
                  <Button variant="outline" type="button" onClick={() => fileInputRef.current?.click()}>
                    Choose file
                  </Button>
                  <span className="text-sm text-muted-foreground">{importFileName || "No file chosen"}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {previewRows.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Preview — {importRows.length} row{importRows.length !== 1 ? "s" : ""} detected
                      {importRows.length > 50 ? " (showing first 50)" : ""}
                    </p>
                    <div className="rounded-md border overflow-x-auto max-h-72 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Renter Name</TableHead>
                            <TableHead>Stage</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Machine Code</TableHead>
                            <TableHead>Brand</TableHead>
                            <TableHead>Revenue</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Paid Off</TableHead>
                            <TableHead>Term</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewRows.map((row, i) => (
                            <TableRow key={i} className={!row.renterName?.trim() ? "opacity-40" : ""}>
                              <TableCell className="font-medium whitespace-nowrap">
                                {row.renterName || <span className="text-muted-foreground italic">blank (skip)</span>}
                              </TableCell>
                              <TableCell>{row.stage || "—"}</TableCell>
                              <TableCell className="text-sm">{row.email || "—"}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{row.phone || "—"}</TableCell>
                              <TableCell className="text-sm">{row.machineCode || "—"}</TableCell>
                              <TableCell className="text-sm">{row.brand || "—"}</TableCell>
                              <TableCell className="text-sm">{row.revenue != null ? `$${row.revenue}` : "—"}</TableCell>
                              <TableCell className="text-sm">{row.costOfMachine != null ? `$${row.costOfMachine}` : "—"}</TableCell>
                              <TableCell className="text-sm">{row.paidOff != null ? (row.paidOff ? "Yes" : "No") : "—"}</TableCell>
                              <TableCell className="text-sm">{row.termMonths != null ? `${row.termMonths} mo` : "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleImport}
                    disabled={importRows.length === 0 || importClientsMutation.isPending}
                  >
                    {importClientsMutation.isPending
                      ? "Importing..."
                      : importRows.length > 0
                        ? `Import ${importRows.length} row${importRows.length !== 1 ? "s" : ""}`
                        : "Import"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>New Client</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Client</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="propertyId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No property</SelectItem>
                          {properties?.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="active_renter">Active Renter</SelectItem>
                          <SelectItem value="past_customer">Past Customer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createClientMutation.isPending}>
                      {createClientMutation.isPending ? "Saving..." : "Create Client"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search clients..." 
            className="pl-8" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full max-w-md">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="lead">Lead</TabsTrigger>
            <TabsTrigger value="active_renter">Active Renter</TabsTrigger>
            <TabsTrigger value="past_customer">Past Customer</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Active Rentals</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : clients?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No clients found.
                </TableCell>
              </TableRow>
            ) : (
              clients?.map((client) => (
                <TableRow 
                  key={client.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setLocation(`/clients/${client.id}`)}
                >
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{getStatusBadge(client.status)}</TableCell>
                  <TableCell className="text-sm">{client.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{client.email || "—"}</TableCell>
                  <TableCell className="text-sm">{client.propertyName || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{client.activeRentalCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.createdAt ? format(new Date(client.createdAt), 'MMM d, yyyy') : ''}
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
