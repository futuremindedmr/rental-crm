import { useState, useMemo } from "react";
import { useListLeads, useUpdateLead, useListClients, useCreateLead, getListLeadsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";

const stages = [
  { id: "contacted", label: "Contacted", color: "bg-blue-100 border-blue-200 text-blue-900" },
  { id: "agreement_sent", label: "Agreement Sent", color: "bg-purple-100 border-purple-200 text-purple-900" },
  { id: "term_selected", label: "Quoted", color: "bg-orange-100 border-orange-200 text-orange-900" },
  { id: "application_sent", label: "Application Sent", color: "bg-amber-100 border-amber-200 text-amber-900" },
  { id: "converted", label: "Converted", color: "bg-green-100 border-green-200 text-green-900" },
] as const;

const newLeadSchema = z.object({
  clientId: z.coerce.number().min(1, "Client is required"),
  stage: z.enum(["contacted", "agreement_sent", "term_selected", "application_sent", "converted"]),
  notes: z.string().optional()
});

export default function Leads() {
  const queryClient = useQueryClient();
  const { data: leads, isLoading } = useListLeads({});
  const { data: clients } = useListClients({});
  
  const updateLead = useUpdateLead();
  const createLead = useCreateLead();

  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof newLeadSchema>>({
    resolver: zodResolver(newLeadSchema),
    defaultValues: {
      stage: "contacted",
      notes: ""
    }
  });

  const onSubmit = (data: z.infer<typeof newLeadSchema>) => {
    createLead.mutate({ data }, {
      onSuccess: () => {
        setDialogOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      }
    });
  };

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    e.dataTransfer.setData("leadId", leadId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = parseInt(e.dataTransfer.getData("leadId"));
    if (!leadId) return;

    const lead = leads?.find(l => l.id === leadId);
    if (lead && lead.stage !== stageId) {
      updateLead.mutate({ 
        id: leadId, 
        data: { stage: stageId as any } 
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        }
      });
    }
  };

  const groupedLeads = useMemo(() => {
    if (!leads) return {};
    return leads.reduce((acc, lead) => {
      acc[lead.stage] = acc[lead.stage] || [];
      acc[lead.stage].push(lead);
      return acc;
    }, {} as Record<string, typeof leads>);
  }, [leads]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Pipeline</h1>
          <p className="text-muted-foreground mt-1">Track and manage potential rentals</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>New Lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Lead</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="clientId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select an existing client" /></SelectTrigger>
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
                <FormField control={form.control} name="stage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Stage</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="agreement_sent">Agreement Sent</SelectItem>
                        <SelectItem value="term_selected">Quoted</SelectItem>
                        <SelectItem value="application_sent">Application Sent</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="resize-none" rows={3} placeholder="Initial thoughts..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createLead.isPending}>
                    {createLead.isPending ? "Saving..." : "Add to Pipeline"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-x-auto min-h-0">
        <div className="grid grid-cols-5 gap-3 h-full pb-4 min-w-[700px]">
          {stages.map(stage => {
            const columnLeads = groupedLeads[stage.id] || [];
            
            return (
              <div 
                key={stage.id} 
                className="min-w-0 flex flex-col bg-muted/40 rounded-xl p-3"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="flex items-center justify-between px-1 pb-3 pt-1">
                  <h3 className="font-semibold text-sm">{stage.label}</h3>
                  <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
                    {columnLeads.length}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3">
                  {isLoading ? (
                    <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
                  ) : columnLeads.length === 0 ? (
                    <div className="h-24 border-2 border-dashed border-muted rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                      Drop leads here
                    </div>
                  ) : (
                    columnLeads.map(lead => (
                      <Card 
                        key={lead.id} 
                        className={`cursor-grab active:cursor-grabbing border hover:border-primary/50 transition-colors shadow-sm`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                      >
                        <CardContent className="p-4">
                          <Link href={`/clients/${lead.clientId}`} className="block">
                            <div className="font-medium text-sm hover:underline">{lead.clientName}</div>
                            <div className="text-xs text-muted-foreground mt-1">{lead.clientPhone || 'No phone'}</div>
                            {lead.notes && (
                              <div className="mt-3 text-xs bg-muted/50 p-2 rounded line-clamp-3 text-muted-foreground">
                                {lead.notes}
                              </div>
                            )}
                            <div className="mt-3 text-[10px] text-muted-foreground text-right">
                              {lead.createdAt ? format(new Date(lead.createdAt), 'MMM d, yyyy') : ''}
                            </div>
                          </Link>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}