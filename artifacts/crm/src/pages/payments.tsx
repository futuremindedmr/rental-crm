import { useListSquarePayments } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

function statusVariant(status: string): "default" | "secondary" | "outline" {
  const s = status.toLowerCase();
  if (s === "completed" || s === "approved" || s === "paid") return "default";
  if (s === "failed" || s === "canceled") return "outline";
  return "secondary";
}

export default function Payments() {
  const { data: payments, isLoading } = useListSquarePayments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground mt-1">Payments synced from your Square account.</p>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : payments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground border-dashed border">
                  No payments found. Sync with Square to see payments here.
                </TableCell>
              </TableRow>
            ) : (
              payments?.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.clientName ?? "—"}</TableCell>
                  <TableCell>{payment.description ?? "—"}</TableCell>
                  <TableCell>
                    {payment.paymentDate ? format(new Date(payment.paymentDate), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(payment.status)}>{payment.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">${payment.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
