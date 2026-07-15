import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useListCategories, useListSuppliers } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { Search, Plus, Edit, Trash2, Filter } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListProductsQueryKey } from "@workspace/api-client-react";
import { Barcode } from "@/components/Barcode";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  category_id: z.coerce.number().optional(),
  color: z.string().optional(),
  imei: z.string().optional(),
  purchase_price: z.coerce.number().min(0),
  sale_price: z.coerce.number().min(0),
  stock_qty: z.coerce.number().min(0),
  supplier_id: z.coerce.number().optional(),
  warranty: z.string().optional(),
  notes: z.string().optional(),
  low_stock_threshold: z.coerce.number().default(5),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function Products() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [priceEditId, setPriceEditId] = useState<number | null>(null);
  const [priceEditVal, setPriceEditVal] = useState("");

  const { data: productsData, isLoading } = useListProducts({ search: searchTerm });
  const { data: categories } = useListCategories();
  const { data: suppliers } = useListSuppliers();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      barcode: "",
      brand: "",
      model: "",
      color: "",
      imei: "",
      purchase_price: 0,
      sale_price: 0,
      stock_qty: 0,
      warranty: "",
      notes: "",
      low_stock_threshold: 5,
    }
  });

  const handleOpenAdd = () => {
    form.reset({
      name: "",
      barcode: "",
      brand: "",
      model: "",
      color: "",
      imei: "",
      purchase_price: 0,
      sale_price: 0,
      stock_qty: 0,
      warranty: "",
      notes: "",
      low_stock_threshold: 5,
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: any) => {
    form.reset({
      name: product.name,
      barcode: product.barcode || "",
      brand: product.brand || "",
      model: product.model || "",
      category_id: product.category_id || undefined,
      color: product.color || "",
      imei: product.imei || "",
      purchase_price: product.purchase_price,
      sale_price: product.sale_price,
      stock_qty: product.stock_qty,
      supplier_id: product.supplier_id || undefined,
      warranty: product.warranty || "",
      notes: product.notes || "",
      low_stock_threshold: product.low_stock_threshold || 5,
    });
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  const handlePriceClick = (product: any) => {
    setPriceEditId(product.id);
    setPriceEditVal(String(product.sale_price));
  };

  const handlePriceSave = (product: any) => {
    const newPrice = Number(priceEditVal);
    if (isNaN(newPrice) || newPrice < 0) { setPriceEditId(null); return; }
    updateProduct.mutate({ id: product.id, data: { ...product, sale_price: newPrice, category_id: product.category_id || undefined, supplier_id: product.supplier_id || undefined } }, {
      onSuccess: () => {
        toast({ title: "Price updated", description: `${product.name} → ${formatCurrency(newPrice)}` });
        setPriceEditId(null);
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProduct.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Product deleted" });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        }
      });
    }
  };

  const onSubmit = (data: ProductFormValues) => {
    if (editingId) {
      updateProduct.mutate({ id: editingId, data }, {
        onSuccess: () => {
          toast({ title: "Product updated" });
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        }
      });
    } else {
      createProduct.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Product created" });
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        }
      });
    }
  };

  const currentBarcode = form.watch("barcode");

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search products..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon"><Filter className="w-4 h-4" /></Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code/Model</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10">Loading...</TableCell></TableRow>
              ) : productsData?.products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="font-medium text-xs font-mono">{product.barcode || '-'}</div>
                    <div className="text-xs text-muted-foreground">{product.brand} {product.model}</div>
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <span className="bg-muted px-2 py-1 rounded text-xs">{product.category_name || '-'}</span>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(product.purchase_price)}</TableCell>
                  <TableCell className="text-right">
                    {priceEditId === product.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          autoFocus
                          type="number"
                          value={priceEditVal}
                          onChange={e => setPriceEditVal(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handlePriceSave(product); if (e.key === "Escape") setPriceEditId(null); }}
                          onBlur={() => handlePriceSave(product)}
                          className="h-7 w-28 text-right text-sm"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePriceClick(product)}
                        className="font-medium text-primary hover:underline hover:text-primary/80 cursor-pointer"
                        title="Click to edit price"
                      >
                        {formatCurrency(product.sale_price)}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.stock_qty <= (product.low_stock_threshold || 5) ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                      {product.stock_qty}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(product)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(product.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Product Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="barcode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode</FormLabel>
                      <div className="flex gap-2">
                        <FormControl><Input {...field} /></FormControl>
                        <Button type="button" variant="outline" onClick={() => {
                          const r = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
                          form.setValue("barcode", r);
                        }}>Gen</Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="flex items-end pb-2">
                    {currentBarcode ? (
                      <div className="border p-2 rounded bg-white w-full flex justify-center">
                        <Barcode value={currentBarcode} height={40} width={1.5} />
                      </div>
                    ) : (
                      <div className="border border-dashed border-muted-foreground/30 p-2 text-center text-xs text-muted-foreground w-full h-[58px] flex items-center justify-center rounded">
                        No barcode
                      </div>
                    )}
                  </div>

                  <FormField control={form.control} name="category_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="supplier_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="brand" render={({ field }) => (
                    <FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="model" render={({ field }) => (
                    <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  
                  <FormField control={form.control} name="purchase_price" render={({ field }) => (
                    <FormItem><FormLabel>Purchase Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="sale_price" render={({ field }) => (
                    <FormItem><FormLabel>Sale Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />

                  <FormField control={form.control} name="stock_qty" render={({ field }) => (
                    <FormItem><FormLabel>Current Stock</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="low_stock_threshold" render={({ field }) => (
                    <FormItem><FormLabel>Low Stock Alert At</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />

                  <FormField control={form.control} name="imei" render={({ field }) => (
                    <FormItem><FormLabel>IMEI (if phone)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="warranty" render={({ field }) => (
                    <FormItem><FormLabel>Warranty</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                    {editingId ? "Update Product" : "Save Product"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
