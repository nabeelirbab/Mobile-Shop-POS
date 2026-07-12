import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useListSales, useGetSettings, useDeleteSale } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Search, Receipt as ReceiptIcon, Trash2, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { printReceiptHtml } from "@/components/ThermalReceipt";
import { useQueryClient } from "@tanstack/react-query";
import { getListSalesQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Sales() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data: salesData, isLoading } = useListSales({ search: searchTerm });
  const { data: settings } = useGetSettings();
  const deleteSale = useDeleteSale();

  const handleViewReceipt = (sale: any) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  const handlePrint = (sale: any) => {
    const html = printReceiptHtml(sale, settings);
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to void this sale? This action cannot be undone and will NOT automatically return stock. Use Return instead if you need to restore stock.")) {
      deleteSale.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Sale voided" });
          queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
        }
      });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search by invoice number..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10">Loading...</TableCell></TableRow>
              ) : salesData?.sales?.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono font-medium">{sale.invoice_no}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(sale.created_at)}</TableCell>
                  <TableCell>{sale.customer_name || 'Walk-in'}</TableCell>
                  <TableCell>{sale.cashier_name}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(sale.grand_total)}</TableCell>
                  <TableCell>
                    <span className="capitalize px-2 py-1 bg-muted rounded-md text-xs">{sale.payment_method}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sale.status === 'completed' ? 'default' : 'destructive'}>
                      {sale.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleViewReceipt(sale)} title="View Receipt">
                      <ReceiptIcon className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handlePrint(sale)} title="Print">
                      <Printer className="w-4 h-4" />
                    </Button>
                    {sale.status === 'completed' && (
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(sale.id)} title="Void">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Receipt</DialogTitle>
            </DialogHeader>
            {selectedSale && (
              <div className="space-y-4">
                <div className="border p-4 bg-white rounded-md max-h-[60vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: printReceiptHtml(selectedSale, settings) }} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>Close</Button>
                  <Button onClick={() => handlePrint(selectedSale)}>Print Receipt</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
