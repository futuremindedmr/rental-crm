import { useState } from "react";
import { Link } from "wouter";
import { useListContacts, useCreateContact, getListContactsQueryKey, useDeleteContact } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Trash2 } from "lucide-react";

export default function Contacts() {
  const [search, setSearch] = useState("");
  const { data: contacts, isLoading } = useListContacts({ search });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    title: "",
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createContact.mutate({ data: formData }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
        setFormData({ firstName: "", lastName: "", email: "", phone: "", title: "" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if(confirm("Are you sure?")) {
      deleteContact.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
        }
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Contact</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createContact.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search contacts..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : contacts?.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <Link href={`/contacts/${contact.id}`}>
                    <span className="font-medium hover:underline cursor-pointer">
                      {contact.firstName} {contact.lastName}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>{contact.email}</TableCell>
                <TableCell>{contact.companyName || "-"}</TableCell>
                <TableCell>
                  <Badge variant={contact.status === "customer" ? "default" : "secondary"}>
                    {contact.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(contact.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
