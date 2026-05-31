import { useState } from "react";
import { 
  useGetClient, 
  useUpdateClient, 
  useDeleteClient,
  useListRentals,
  useListAgreements,
  useCreateAgreement,
  useDeleteAgreement,
  useListSquarePayments,
  useListLeads,
  useCreateLead,
  useCreateRental,
  useDeleteRental,
  getListAgreementsQueryKey,
  getGetClientQueryKey,
  getListRentalsQueryKey,
  getListLeadsQueryKey
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowLeft, Edit, Trash2, Download, FileText, Upload, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ObjectUploader } from "@workspace/object-storage-web";

const editClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  status: z.enum(["lead", "active_renter", "past_customer"])
});

const newRentalSchema = z.object({
  unitDescription: z.string().min(1, "Unit description is required"),
  startDate: z.string().min(1, "Start date is required"),
  termMonths: z.coerce.number().min(1, "Term is required"),
  monthlyRate: z.coerce.number().min(0, "Rate must be positive")
});

export default function ClientDetail() {
  const [, params] = useRoute("/clients/:id");
  const [, setLocation] = useLocation();
  const clientId = Number(params?.id);
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rentalDialogOpen, setRentalDialogOpen] = useState(false);
  
  const { data: client, isLoading: clientLoading } = useGetClient(clientId, { query: { enabled: !!clientId } });
  const { data: rentals, isLoading: rentalsLoading } = useListRentals({ clientId }, { query: { enabled: !!clientId } });
  const { data: agreements, isLoading: agreementsLoading } = useListAgreements(clientId, { query: { enabled: !!clientId } });
  const { data: payments, isLoading: paymentsLoading } = useListSquarePayments({ clientId }, { query: { enabled: !!clientId } });
  const { data: leads, isLoading: leadsLoading } = useListLeads({ clientId }, { query: { enabled: !!clientId } });

  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();
  const createRentalMutation = useCreateRental();
  const deleteRentalMutation = useDeleteRental();
  const createAgreementMutation = useCreateAgreement();
  const deleteAgreementMutation = useDeleteAgreement();
  const createLeadMutation = useCreateLead();

  const editForm = useForm<z.infer<typeof editClientSchema>>({
    resolver: zodResolver(editClientSchema),
    values: {
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      address: client?.address || "",
      status: (client?.status as any) || "lead"
    }
  });

  const rentalForm = useForm<z.infer<typeof newRentalSchema>>({
    resolver: zodResolver(newRentalSchema),
    defaultValues: {
      unitDescription: "",
      startDate: new Date().toISOString().split('T')[0],
      termMonths: 12,
      monthlyRate: 0
    }
  });

  if (!clientId || clientLoading) {
    return <div className="p-8 text-muted-foreground">Loading client...</div>;
  }

  if (!client) {
    return <div className="p-8 text-muted-foreground">Client not found.</div>;
  }

  const onEditSubmit = (data: z.infer<typeof editClientSchema>) => {
    updateClientMutation.mutate({ id: clientId, data }, {
      onSuccess: () => {
        setIsEditing(false);
        queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
      }
    });
  };

  const onDeleteClient = () => {
    deleteClientMutation.mutate({ id: clientId }, {
      onSuccess: () => {
        setLocation("/clients");
      }
    });
  };

  const onRentalSubmit = (data: z.infer<typeof newRentalSchema>) => {
    createRentalMutation.mutate({ 
      data: { ...data, clientId, startDate: new Date(data.startDate).toISOString() } 
    }, {
      onSuccess: () => {
        setRentalDialogOpen(false);
        rentalForm.reset();
        queryClient.invalidateQueries({ queryKey: getListRentalsQueryKey({ clientId }) });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "lead": return <Badge variant="secondary" className="bg-slate-200 text-slate-800">Lead</Badge>;
      case "active_renter": return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Active Renter</Badge>;
      case "past_customer": return <Badge variant="secondary" className="bg-gray-200 text-gray-800">Past Customer</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const clientLead = leads?.[0];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/clients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
        {getStatusBadge(client.status)}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b px-6 py-4">
          <CardTitle className="text-lg font-medium">Client Details</CardTitle>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          {isEditing ? (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={editForm.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={editForm.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateClientMutation.isPending}>Save</Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Email</div>
                <div>{client.email || "—"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Phone</div>
                <div>{client.phone || "—"}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm font-medium text-muted-foreground">Address</div>
                <div>{client.address || "—"}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="rentals" className="w-full">
        <TabsList>
          <TabsTrigger value="rentals">Rentals</TabsTrigger>
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="lead">Lead</TabsTrigger>
        </TabsList>
        
        <TabsContent value="rentals" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
              <CardTitle className="text-lg">Active & Past Rentals</CardTitle>
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
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={rentalForm.control} name="termMonths" render={({ field }) => (
                          <FormItem><FormLabel>Term (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={rentalForm.control} name="monthlyRate" render={({ field }) => (
                          <FormItem><FormLabel>Monthly Rate ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
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
              ) : rentals?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground border-dashed border-t m-4 rounded-md">
                  No rentals for this client.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6">Unit</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rentals?.map(rental => (
                      <TableRow key={rental.id}>
                        <TableCell className="px-6 font-medium">{rental.unitDescription}</TableCell>
                        <TableCell>{rental.startDate ? format(new Date(rental.startDate), 'MMM d, yyyy') : '—'}</TableCell>
                        <TableCell>{rental.termMonths} mo</TableCell>
                        <TableCell>
                          {rental.monthsRemaining <= 2 ? (
                            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                              {rental.monthsRemaining} mo
                            </Badge>
                          ) : (
                            <span>{rental.monthsRemaining} mo</span>
                          )}
                        </TableCell>
                        <TableCell>${rental.monthlyRate?.toFixed(2)}/mo</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this rental?")) {
                                deleteRentalMutation.mutate({ id: rental.id }, {
                                  onSuccess: () => queryClient.invalidateQueries({ queryKey: getListRentalsQueryKey({ clientId }) })
                                });
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

        <TabsContent value="agreements" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
              <CardTitle className="text-lg">Rental Agreements</CardTitle>
              <ObjectUploader
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
                  const objectPath = result.successful?.[0]?.response?.body?.objectPath;
                  const fileName = result.successful?.[0]?.name;
                  if (objectPath && fileName) {
                    createAgreementMutation.mutate({ 
                      data: { clientId, objectPath, fileName } 
                    }, {
                      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAgreementsQueryKey(clientId) })
                    });
                  }
                }}
              >
                Upload Agreement
              </ObjectUploader>
            </CardHeader>
            <CardContent className="p-0">
              {agreementsLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading agreements...</div>
              ) : agreements?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground border-dashed border-t m-4 rounded-md">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  No agreements uploaded.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6">File Name</TableHead>
                      <TableHead>Date Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agreements?.map(agreement => (
                      <TableRow key={agreement.id}>
                        <TableCell className="px-6 font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {agreement.fileName}
                        </TableCell>
                        <TableCell>{agreement.createdAt ? format(new Date(agreement.createdAt), 'MMM d, yyyy') : '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild>
                            <a href={`/api/storage/objects/${encodeURIComponent(agreement.objectPath)}`} target="_blank" rel="noopener noreferrer" download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this agreement?")) {
                                deleteAgreementMutation.mutate({ id: agreement.id }, {
                                  onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAgreementsQueryKey(clientId) })
                                });
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

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader className="border-b px-6 py-4">
              <CardTitle className="text-lg">Square Payments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {paymentsLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading payments...</div>
              ) : payments?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground border-dashed border-t m-4 rounded-md">
                  No payments found for this client.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6">Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments?.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell className="px-6">{payment.paymentDate ? format(new Date(payment.paymentDate), 'MMM d, yyyy') : '—'}</TableCell>
                        <TableCell className="font-medium">${(payment.amount / 100).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={payment.status === 'COMPLETED' ? "bg-green-100 text-green-800" : ""}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{payment.description || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lead" className="mt-4">
          <Card>
            <CardHeader className="border-b px-6 py-4">
              <CardTitle className="text-lg">Lead Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {leadsLoading ? (
                <div className="text-muted-foreground">Loading lead status...</div>
              ) : clientLead ? (
                <div className="space-y-4 border p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Current Stage</div>
                      <Badge className="text-sm px-3 py-1 bg-primary text-primary-foreground">{clientLead.stage.replace('_', ' ').toUpperCase()}</Badge>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      Added {clientLead.createdAt ? format(new Date(clientLead.createdAt), 'MMM d, yyyy') : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Notes</div>
                    <p className="bg-background border p-3 rounded text-sm min-h-[60px]">{clientLead.notes || 'No notes added.'}</p>
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" onClick={() => setLocation("/leads")}>View in Pipeline</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 border border-dashed rounded-md">
                  <p className="text-muted-foreground mb-4">This client is not currently in the lead pipeline.</p>
                  <Button onClick={() => {
                    createLeadMutation.mutate({ 
                      data: { clientId, stage: 'contacted', notes: 'Added from client detail page' } 
                    }, {
                      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey({ clientId }) })
                    });
                  }} disabled={createLeadMutation.isPending}>
                    {createLeadMutation.isPending ? "Adding..." : "Add to Pipeline"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              This action cannot be undone. This will permanently delete <strong>{client.name}</strong> and remove all associated data, including rentals and lead history.
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