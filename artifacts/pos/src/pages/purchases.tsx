import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useListPurchases, useListSuppliers, useListProducts, useCreatePurchase } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Search, Plus, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListPurchasesQueryKey, getListProductsQueryKey } from "@workspace/api-client-react";

export default function Purchases() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);

  // New Purchase State
  const [supplierId, setSupplierId] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Array<{ product_id: number, product_name: string, quantity: number, unit_cost: number }>>([]);
  const [productSearch, setProductSearch] = useState("");

  const { data: purchasesData, isLoading } = useListPurchases({});
  const { data: suppliers } = useListSuppliers();
  const { data: productsData } = useListProducts({ search: productSearch });
  
  const createPurchase = useCreatePurchase();

  const handleOpenAdd = () => {
    setSupplierId("");
    setPaidAmount(0);
    setNotes("");
    setItems([]);
    setIsModalOpen(true);
  };

  const handleView = (purchase: any) => {
    setSelectedPurchase(purchase);
    setViewModalOpen(true);
  };

  const addItem = (product: any) => {
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      setItems(items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { product_id: product.id, product_name: product.name, quantity: 1, unit_cost: product.purchase_price }]);
    }
    setProductSearch("");
  };

  const updateItemQty = (productId: number, qty: number) => {
    if (qty <= 0) return;
    setItems(items.map(i => i.product_id === productId ? { ...i, quantity: qty } : i));
  };

  const updateItemCost = (productId: number, cost: number) => {
    setItems(items.map(i => i.product_id === productId ? { ...i, unit_cost: cost } : i));
  };

  const removeItem = (productId: number) => {
    setItems(items.filter(i => i.product_id !== productId));
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

  const onSubmit = () => {
    if (items.length === 0) {
      toast({ title: "Please add products", variant: "destructive" });
      return;
    }
    
    createPurchase.mutate({
      data: {
        supplier_id: supplierId ? parseInt(supplierId) : undefined,
        paid_amount: paidAmount,
        notes: notes,
        items: items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_cost: i.unit_cost
        }))
      }
    }, {
      onSuccess: () => {
        toast({ title: "Purchase order created. Stock updated." });
        setIsModalOpen(false);
        queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); // Since stock updated
      }
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" /> New Purchase
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Paid Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10">Loading...</TableCell></TableRow>
              ) : purchasesData?.purchases?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No purchases recorded yet.</TableCell></TableRow>
              ) : purchasesData?.purchases?.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell className="font-mono">{purchase.invoice_no}</TableCell>
                  <TableCell>{formatDateTime(purchase.created_at)}</TableCell>
                  <TableCell>{purchase.supplier_name || 'Walk-in'}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(purchase.total_amount)}</TableCell>
                  <TableCell className="text-right text-green-600 font-medium">{formatCurrency(purchase.paid_amount)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleView(purchase)}>View Details</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* View Modal */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Purchase Details - {selectedPurchase?.invoice_no}</DialogTitle>
            </DialogHeader>
            {selectedPurchase && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted p-4 rounded-md">
                  <div><span className="text-muted-foreground">Date:</span> {formatDateTime(selectedPurchase.created_at)}</div>
                  <div><span className="text-muted-foreground">Supplier:</span> {selectedPurchase.supplier_name || 'None'}</div>
                  <div><span className="text-muted-foreground">Total:</span> <span className="font-bold">{formatCurrency(selectedPurchase.total_amount)}</span></div>
                  <div><span className="text-muted-foreground">Paid:</span> <span className="text-green-600 font-medium">{formatCurrency(selectedPurchase.paid_amount)}</span></div>
                </div>
                
                <h3 className="font-semibold pt-2">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPurchase.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setViewModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record Purchase & Add Stock</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="md:col-span-2 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input 
                    placeholder="Search products to add..." 
                    className="pl-9"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  {productSearch && productsData?.products && productsData.products.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-card border shadow-lg rounded-md z-50 max-h-60 overflow-y-auto">
                      {productsData.products.map(p => (
                        <div key={p.id} className="p-2 border-b hover:bg-muted cursor-pointer flex justify-between items-center" onClick={() => addItem(p)}>
                          <div>
                            <div className="font-medium text-sm">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.barcode || p.model}</div>
                          </div>
                          <Plus className="w-4 h-4" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border rounded-md min-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="w-32">Unit Cost</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(item => (
                        <TableRow key={item.product_id}>
                          <TableCell className="font-medium text-sm">{item.product_name}</TableCell>
                          <TableCell>
                            <Input type="number" className="h-8 p-1 text-center" value={item.quantity} onChange={(e) => updateItemQty(item.product_id, parseInt(e.target.value) || 0)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" className="h-8 p-1 text-right" value={item.unit_cost} onChange={(e) => updateItemCost(item.product_id, parseFloat(e.target.value) || 0)} />
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(item.quantity * item.unit_cost)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(item.product_id)}><Trash2 className="w-4 h-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {items.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Add products to purchase</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-4 bg-muted/50 p-4 rounded-xl border border-border">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Supplier</label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select Supplier (Optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk-in">None</SelectItem>
                      {suppliers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.company || s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Input className="bg-background" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between text-lg font-bold mb-4">
                    <span>Total Amount</span>
                    <span className="text-primary">{formatCurrency(totalAmount)}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Amount Paid</label>
                    <Input 
                      type="number" 
                      className="bg-background text-lg h-10 font-bold text-green-600" 
                      value={paidAmount} 
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                </div>

                <Button className="w-full mt-6" onClick={onSubmit} disabled={createPurchase.isPending || items.length === 0}>
                  {createPurchase.isPending ? "Saving..." : "Confirm Purchase"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}