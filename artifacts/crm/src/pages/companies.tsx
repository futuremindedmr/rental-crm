import { useState } from "react";
import { Link } from "wouter";
import { useListCompanies, useCreateCompany, getListCompaniesQueryKey, useDeleteCompany } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Trash2 } from "lucide-react";

export default function Companies() {
  const [search, setSearch] = useState("");
  const { data: companies, isLoading } = useListCompanies({ search });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const createCompany = useCreateCompany();
  const deleteCompany = useDeleteCompany();

  const [formData, setFormData] = useState({
    name: "",
    domain: "",
    industry: "",
    size: "",
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createCompany.mutate({ data: formData }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
        setFormData({ name: "", domain: "", industry: "", size: "" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if(confirm("Are you sure?")) {
      deleteCompany.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
        }
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Company</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Company</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Domain</Label>
                <Input value={formData.domain} onChange={(e) => setFormData({...formData, domain: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input value={formData.industry} onChange={(e) => setFormData({...formData, industry: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Size</Label>
                <Input value={formData.size} onChange={(e) => setFormData({...formData, size: e.target.value})} placeholder="e.g. 1-10, 11-50" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createCompany.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search companies..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : companies?.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  <Link href={`/companies/${company.id}`}>
                    <span className="font-medium hover:underline cursor-pointer">
                      {company.name}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>{company.domain || "-"}</TableCell>
                <TableCell>{company.industry || "-"}</TableCell>
                <TableCell>{company.contactCount || 0}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(company.id)}>
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
