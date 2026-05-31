import { useState } from "react";
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
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListClients } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const newRentalSchema = z.object({
  clientId: z.coerce.number().min(1, "Client is required"),
  unitDescription: z.string().min(1, "Unit description is required"),
  startDate: z.string().min(1, "Start date is required"),
  termMonths: z.coerce.number().min(1, "Term is required"),
  monthlyRate: z.coerce.number().min(0, "Rate must be positive")
});

export default function Rentals() {
  const [filter, setFilter] = useState<"all" | "expiring">("all");
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);

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
    createRentalMutation.mutate({ data: { ...data, startDate: new Date(data.startDate).toISOString() } }, {
      onSuccess: () => {
        setDialogOpen(false);
        form.reset();
      }
    });
  };

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

      <div className="flex items-center gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all"|"expiring")} className="w-full max-w-md">
          <TabsList>
            <TabsTrigger value="all">All Rentals</TabsTrigger>
            <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Unit Description</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead className="text-right">Rate/mo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : rentals?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground border-dashed border">
                  No rentals found.
                </TableCell>
              </TableRow>
            ) : (
              rentals?.map((rental) => (
                <TableRow 
                  key={rental.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setLocation(`/clients/${rental.clientId}`)}
                >
                  <TableCell className="font-medium">{rental.clientName}</TableCell>
                  <TableCell>{rental.unitDescription}</TableCell>
                  <TableCell>
                    {rental.startDate ? format(new Date(rental.startDate), 'MMM d, yyyy') : ''}
                  </TableCell>
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
                  <TableCell className="text-right font-medium">
                    ${rental.monthlyRate?.toFixed(2)}
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