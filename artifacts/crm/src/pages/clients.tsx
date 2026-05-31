import { useState } from "react";
import { useListClients, useCreateClient, useListProperties } from "@workspace/api-client-react";
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
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Search, Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const newClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  propertyId: z.string().optional(),
  status: z.enum(["lead", "active_renter", "past_customer"])
});

export default function Clients() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: clients, isLoading } = useListClients({ 
    search: search || undefined, 
    status: statusFilter === "all" ? undefined : (statusFilter as any) 
  });

  const createClientMutation = useCreateClient();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCsv} disabled={!clients?.length}>
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>
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