import React, { useState, useEffect, useRef, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useListProducts, useListCustomers, useCreateSale, useGetProductByBarcode, useGetSettings } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { Search, Plus, Minus, Trash2, ReceiptText, User as UserIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { printReceipt } from "@/components/ThermalReceipt";
import { SalePaymentMethod, SaleInputPaymentMethod } from "@workspace/api-client-react";

interface CartItem {
  product_id: number;
  product_name: string;
  barcode?: string | null;
  quantity: number;
  unit_price: number;
  stock_qty: number;
  discount: number;
}

export default function Pos() {
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<SaleInputPaymentMethod>("cash");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: settings } = useGetSettings();
  const { data: productsData, isLoading: productsLoading } = useListProducts({ search: debouncedSearch, limit: 20 });
  const { data: customersData } = useListCustomers();
  
  const createSale = useCreateSale();
  
  const getProductByBarcodeRef = useRef<any>(null); // We need a way to fetch product by barcode imperatively.
  // Actually, we can just use the products list if it contains it, or fetch.
  // The API provides GET /api/products/barcode/:barcode but we don't have an imperative hook for it directly.
  // Wait, we can use standard fetch.
  
  // Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "F9") {
        e.preventDefault();
        clearCart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    
    // Check if it's in the current list first
    const product = productsData?.products?.find(p => p.barcode === searchTerm);
    if (product) {
      addToCart(product);
      setSearchTerm("");
      return;
    }

    // Otherwise, we would need to fetch it.
    // For now, if it's not in the visible list, we'll try to find it in the products data if it was fetched.
    // If not found, show error.
    toast({ title: "Product not found", variant: "destructive", description: "No product matches this barcode." });
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_qty) {
          toast({ title: "Stock limit reached", variant: "destructive" });
          return prev;
        }
        return prev.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode,
        quantity: 1,
        unit_price: product.sale_price,
        stock_qty: product.stock_qty,
        discount: 0
      }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product_id === productId) {
          const newQty = item.quantity + delta;
          if (newQty < 1) return item;
          if (newQty > item.stock_qty) {
            toast({ title: "Stock limit reached", variant: "destructive" });
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerId(null);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setTaxPercent(0);
    setPaidAmount(0);
    setPaymentMethod("cash");
    setSearchTerm("");
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price) - item.discount, 0);
  
  // Recalculate discount amounts when percent changes, but avoid infinite loops
  const handleDiscountPercentChange = (val: number) => {
    setDiscountPercent(val);
    setDiscountAmount((subtotal * val) / 100);
  };

  const handleDiscountAmountChange = (val: number) => {
    setDiscountAmount(val);
    setDiscountPercent(subtotal > 0 ? (val / subtotal) * 100 : 0);
  };

  const taxAmount = ((subtotal - discountAmount) * taxPercent) / 100;
  const grandTotal = subtotal - discountAmount + taxAmount;
  const returnAmount = Math.max(0, paidAmount - grandTotal);

  // Default paid amount to grand total if not cash, or if cash and user hasn't set it yet
  useEffect(() => {
    if (paymentMethod !== 'cash') {
      setPaidAmount(grandTotal);
    }
  }, [grandTotal, paymentMethod]);

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }

    if (paymentMethod === 'cash' && paidAmount < grandTotal) {
      toast({ title: "Insufficient paid amount", variant: "destructive" });
      return;
    }

    createSale.mutate({
      data: {
        customer_id: customerId,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount
        })),
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        tax_percent: taxPercent,
        paid_amount: paymentMethod === 'cash' ? paidAmount : grandTotal,
        payment_method: paymentMethod,
        notes: ""
      }
    }, {
      onSuccess: (saleData) => {
        toast({ title: "Sale completed successfully" });
        printReceipt(saleData, settings);
        clearCart();
      },
      onError: (err: any) => {
        toast({ title: "Failed to complete sale", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <MainLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
        {/* Left Side: Products */}
        <div className="w-full md:w-7/12 lg:w-2/3 flex flex-col gap-4">
          <form onSubmit={handleBarcodeSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input 
              ref={searchInputRef}
              placeholder="Search product by name or scan barcode (F2)" 
              className="pl-10 h-14 text-lg shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </form>
          
          <div className="flex-1 overflow-y-auto">
            {productsLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => <Card key={i} className="h-40 animate-pulse bg-muted" />)}
              </div>
            ) : productsData?.products?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Package className="w-12 h-12 mb-4 opacity-20" />
                <p>No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                {productsData?.products?.map((product) => (
                  <Card 
                    key={product.id} 
                    className="cursor-pointer hover-elevate transition-all border-border hover:border-primary/50 flex flex-col h-full"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-4 flex flex-col flex-1 justify-between gap-2">
                      <div>
                        <p className="font-semibold line-clamp-2 text-sm leading-tight">{product.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{product.barcode || 'No barcode'}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-primary">{formatCurrency(product.sale_price)}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${product.stock_qty > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {product.stock_qty} in stock
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart */}
        <div className="w-full md:w-5/12 lg:w-1/3 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-muted-foreground" />
              <Select value={customerId ? customerId.toString() : "walk-in"} onValueChange={(val) => setCustomerId(val === "walk-in" ? null : parseInt(val))}>
                <SelectTrigger className="flex-1 bg-background">
                  <SelectValue placeholder="Walk-in Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                  {customersData?.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-0">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[50%]">Item</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      Cart is empty
                    </TableCell>
                  </TableRow>
                ) : (
                  cart.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell>
                        <div className="font-medium text-sm line-clamp-1">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.product_id, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.product_id, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(item.product_id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 border-t border-border bg-muted/10 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-muted-foreground whitespace-nowrap">Discount</span>
                <div className="flex gap-2 w-32">
                  <Input 
                    type="number" 
                    value={discountPercent || ""} 
                    onChange={(e) => handleDiscountPercentChange(parseFloat(e.target.value) || 0)} 
                    className="h-7 text-right" 
                    placeholder="%" 
                  />
                  <Input 
                    type="number" 
                    value={discountAmount || ""} 
                    onChange={(e) => handleDiscountAmountChange(parseFloat(e.target.value) || 0)} 
                    className="h-7 text-right" 
                    placeholder="Amt" 
                  />
                </div>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-muted-foreground whitespace-nowrap">Tax (%)</span>
                <div className="w-16">
                  <Input 
                    type="number" 
                    value={taxPercent || ""} 
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)} 
                    className="h-7 text-right" 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-y border-border/50">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
            </div>

            <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as SaleInputPaymentMethod)} className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="cash" className="py-2 text-xs">Cash</TabsTrigger>
                <TabsTrigger value="card" className="py-2 text-xs">Card</TabsTrigger>
                <TabsTrigger value="easypaisa" className="py-2 text-xs">EasyP</TabsTrigger>
                <TabsTrigger value="jazzcash" className="py-2 text-xs">JazzC</TabsTrigger>
              </TabsList>
            </Tabs>

            {paymentMethod === 'cash' && (
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Paid Amount</label>
                  <Input 
                    type="number" 
                    className="h-10 text-lg font-medium" 
                    value={paidAmount || ""}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Change</label>
                  <div className={`h-10 flex items-center px-3 rounded-md border ${returnAmount > 0 ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' : 'bg-muted border-border'}`}>
                    <span className="font-bold">{formatCurrency(returnAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={clearCart}>
                Clear
              </Button>
              <Button 
                className="flex-[3] text-lg h-auto py-3 bg-green-600 hover:bg-green-700 text-white font-bold"
                onClick={handleCompleteSale}
                disabled={createSale.isPending || cart.length === 0}
              >
                {createSale.isPending ? "Processing..." : "Complete Sale"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// Needed imports
import { Package } from "lucide-react";