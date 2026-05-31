import { useState } from "react";
import { useListDeals, useCreateDeal, getListDealsQueryKey, useUpdateDeal } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { Deal, DealInputStage, DealUpdateStage } from "@workspace/api-client-react/src/generated/api.schemas";

const STAGES = [
  { id: "lead", label: "Lead" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "closed_won", label: "Closed Won" },
  { id: "closed_lost", label: "Closed Lost" }
];

export default function Deals() {
  const { data: deals, isLoading } = useListDeals();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();

  const [formData, setFormData] = useState({
    title: "",
    value: 0,
    stage: "lead" as DealInputStage,
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createDeal.mutate({ data: formData }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: getListDealsQueryKey() });
        setFormData({ title: "", value: 0, stage: "lead" as DealInputStage });
      }
    });
  };

  const handleStageChange = (dealId: number, newStage: DealUpdateStage) => {
    updateDeal.mutate({ id: dealId, data: { stage: newStage } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDealsQueryKey() });
      }
    });
  };

  const getDealsByStage = (stageId: string) => {
    return deals?.filter(d => d.stage === stageId) || [];
  };

  if (isLoading) return <div>Loading pipeline...</div>;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Deals Pipeline</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Deal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Deal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Value ($)</Label>
                <Input type="number" value={formData.value} onChange={(e) => setFormData({...formData, value: Number(e.target.value)})} required />
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={formData.stage} onValueChange={(val) => setFormData({...formData, stage: val as DealInputStage})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createDeal.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max h-full">
          {STAGES.map(stage => {
            const stageDeals = getDealsByStage(stage.id);
            const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
            
            return (
              <div key={stage.id} className="w-80 flex flex-col bg-muted/30 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">{stage.label}</h3>
                  <div className="text-xs text-muted-foreground font-medium bg-background px-2 py-1 rounded-md">
                    {stageDeals.length} • ${stageValue.toLocaleString()}
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3">
                  {stageDeals.map(deal => (
                    <Card key={deal.id} className="cursor-grab active:cursor-grabbing border-muted-foreground/20 hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 space-y-2">
                        <div className="font-medium leading-none">{deal.title}</div>
                        <div className="text-sm font-semibold text-primary">
                          ${deal.value?.toLocaleString()}
                        </div>
                        {deal.companyName && (
                          <div className="text-xs text-muted-foreground">{deal.companyName}</div>
                        )}
                        
                        <div className="pt-2">
                          <Select 
                            value={deal.stage} 
                            onValueChange={(val) => handleStageChange(deal.id, val as DealUpdateStage)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STAGES.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
