import { useState, useMemo } from "react";
import { useListRentals } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { Star } from "lucide-react";
import { cn, safeToFixed } from "@/lib/utils";

function StarRating({ score }: { score: number | null | undefined }) {
  if (!score) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < score ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"
          )}
        />
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (status === "in_storage") {
    return (
      <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
        In Storage
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
      Installed
    </Badge>
  );
}

export default function Inventory() {
  const [statusFilter, setStatusFilter] = useState<"all" | "installed" | "in_storage">("all");
  const [, setLocation] = useLocation();

  const { data: rentals, isLoading } = useListRentals({});

  const machines = useMemo(() => {
    if (!rentals) return [];
    let list = rentals.filter((r) => r.machineCode);
    if (statusFilter === "installed") list = list.filter((r) => r.machineStatus !== "in_storage");
    if (statusFilter === "in_storage") list = list.filter((r) => r.machineStatus === "in_storage");
    return list.sort((a, b) =>
      (a.machineCode ?? "").localeCompare(b.machineCode ?? "", undefined, { numeric: true, sensitivity: "base" })
    );
  }, [rentals, statusFilter]);

  const allCount = rentals?.filter((r) => r.machineCode).length ?? 0;
  const installedCount = rentals?.filter((r) => r.machineCode && r.machineStatus !== "in_storage").length ?? 0;
  const storageCount = rentals?.filter((r) => r.machineCode && r.machineStatus === "in_storage").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <span className="text-sm text-muted-foreground">{allCount} machine{allCount !== 1 ? "s" : ""} total</span>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
        <TabsList>
          <TabsTrigger value="all">All ({allCount})</TabsTrigger>
          <TabsTrigger value="installed">Installed ({installedCount})</TabsTrigger>
          <TabsTrigger value="in_storage">In Storage ({storageCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Machine Code</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Renter</TableHead>
              <TableHead>Machine Cost</TableHead>
              <TableHead>Paid Off</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : machines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {statusFilter === "all"
                    ? "No machines found. Add a machine code to a rental to see it here."
                    : "No machines match this filter."}
                </TableCell>
              </TableRow>
            ) : (
              machines.map((rental) => (
                <TableRow
                  key={rental.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setLocation(`/clients/${rental.clientId}`)}
                >
                  <TableCell className="font-semibold">{rental.machineCode}</TableCell>
                  <TableCell>{rental.brand || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {rental.clientName
                      ? <span className="text-sm">{rental.clientName}</span>
                      : <span className="text-muted-foreground text-sm">—</span>}
                  </TableCell>
                  <TableCell>
                    {rental.costOfMachine != null
                      ? `$${safeToFixed(rental.costOfMachine)}`
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {rental.paidOff == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : rental.paidOff ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Yes</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <StarRating score={rental.conditionScore} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={rental.machineStatus} />
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
