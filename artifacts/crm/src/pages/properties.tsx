import { useState } from "react";
import { useListProperties, useCreateProperty, useDeleteProperty } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListPropertiesQueryKey } from "@workspace/api-client-react";

const newPropertySchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  unitCount: z.coerce.number().min(0, "Must be 0 or more"),
  notes: z.string().optional(),
});

export default function Properties() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const qc = useQueryClient();

  const { data: properties, isLoading } = useListProperties();
  const createProperty = useCreateProperty();
  const deleteProperty = useDeleteProperty();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListPropertiesQueryKey() });

  const form = useForm<z.infer<typeof newPropertySchema>>({
    resolver: zodResolver(newPropertySchema),
    defaultValues: { name: "", address: "", unitCount: 0, notes: "" },
  });

  const onSubmit = (data: z.infer<typeof newPropertySchema>) => {
    createProperty.mutate(
      { data },
      {
        onSuccess: () => {
          invalidate();
          setDialogOpen(false);
          form.reset();
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteProperty.mutate({ id }, { onSuccess: invalidate });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground mt-1">Locations where your rental units are installed.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>New Property</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Property</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} placeholder="e.g., Maple Street Apartments" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} placeholder="123 Maple St, Springfield" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="unitCount" render={({ field }) => (
                  <FormItem><FormLabel>Number of Units</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} placeholder="Optional details" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createProperty.isPending}>
                    {createProperty.isPending ? "Saving..." : "Create Property"}
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
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : properties?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground border-dashed border">
                  No properties yet. Add your first location to get started.
                </TableCell>
              </TableRow>
            ) : (
              properties?.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium">{property.name}</TableCell>
                  <TableCell>{property.address ?? "—"}</TableCell>
                  <TableCell className="text-right">{property.unitCount}</TableCell>
                  <TableCell className="text-muted-foreground">{property.notes ?? "—"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(property.id)}
                      disabled={deleteProperty.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
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
