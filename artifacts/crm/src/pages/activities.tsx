import { useListActivities, useUpdateActivity, getListActivitiesQueryKey, useCreateActivity, useDeleteActivity } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Calendar, Phone, Mail, FileText, CheckSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import type { ActivityInputType } from "@workspace/api-client-react/src/generated/api.schemas";

export default function Activities() {
  const { data: activities, isLoading } = useListActivities();
  const queryClient = useQueryClient();
  const updateActivity = useUpdateActivity();
  const createActivity = useCreateActivity();
  const deleteActivity = useDeleteActivity();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    subject: "",
    type: "task" as ActivityInputType,
  });

  const handleToggle = (id: number, currentCompleted: boolean) => {
    updateActivity.mutate({ id, data: { completed: !currentCompleted } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
      }
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createActivity.mutate({ data: formData }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
        setFormData({ subject: "", type: "task" as ActivityInputType });
      }
    });
  };

  const handleDelete = (id: number) => {
    if(confirm("Delete activity?")) {
      deleteActivity.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
        }
      })
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "call": return <Phone className="w-4 h-4 text-blue-500" />;
      case "email": return <Mail className="w-4 h-4 text-orange-500" />;
      case "meeting": return <Calendar className="w-4 h-4 text-purple-500" />;
      case "note": return <FileText className="w-4 h-4 text-gray-500" />;
      default: return <CheckSquare className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Activity</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Activity</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val as ActivityInputType})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createActivity.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-md">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : activities?.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No activities found.</div>
        ) : (
          <div className="divide-y">
            {activities?.map((activity) => (
              <div key={activity.id} className={`p-4 flex items-start gap-4 transition-colors hover:bg-muted/50 ${activity.completed ? 'opacity-60' : ''}`}>
                <div className="mt-1">
                  <Checkbox 
                    checked={activity.completed} 
                    onCheckedChange={() => handleToggle(activity.id, !!activity.completed)}
                  />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  {getIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-none ${activity.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {activity.subject}
                  </p>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    {activity.contactName && <span>Contact: {activity.contactName}</span>}
                    {activity.dealTitle && <span>Deal: {activity.dealTitle}</span>}
                  </div>
                </div>
                <div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(activity.id)}>
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
