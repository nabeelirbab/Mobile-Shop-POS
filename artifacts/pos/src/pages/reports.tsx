import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useGetSalesReport, useGetProfitReport, useGetBestSellingReport } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function Reports() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  
  const { data: salesReport, isLoading: salesLoading } = useGetSalesReport({ period });
  const { data: profitReport, isLoading: profitLoading } = useGetProfitReport();
  const { data: bestSellingReport, isLoading: bestSellingLoading } = useGetBestSellingReport({ limit: 10 });

  return (
    <MainLayout>
      <div className="space-y-6 pb-10">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        
        <Tabs defaultValue="sales" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mb-6">
            <TabsTrigger value="sales">Sales & Revenue</TabsTrigger>
            <TabsTrigger value="profit">Profit & Loss</TabsTrigger>
            <TabsTrigger value="products">Top Products</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sales" className="space-y-6 mt-0">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Sales Report</h2>
              <div className="w-40">
                <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                  <SelectTrigger><SelectValue placeholder="Period" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily (Last 30)</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{formatCurrency(salesReport?.total_sales || 0)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Invoices</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{salesReport?.total_count || 0}</p></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
              <CardContent className="h-80">
                {!salesLoading && salesReport?.data ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesReport.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(val) => formatDate(val)} />
                      <YAxis tickFormatter={(val) => `Rs ${val / 1000}k`} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} labelFormatter={(label) => formatDate(label)} />
                      <Bar dataKey="total_sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center">Loading...</div>}
              </CardContent>
            </Card>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Invoices</TableHead>
                    <TableHead className="text-right">Gross Sales</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Net Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesReport?.data.map((row: any) => (
                    <TableRow key={row.date}>
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell className="text-center">{row.sales_count}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.total_sales)}</TableCell>
                      <TableCell className="text-right text-red-500">{formatCurrency(row.total_discount)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(row.net_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="profit" className="space-y-6 mt-0">
            <h2 className="text-xl font-semibold">Profit & Loss Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net Profit</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold text-primary">{formatCurrency(profitReport?.net_profit || 0)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Gross Profit</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{formatCurrency(profitReport?.gross_profit || 0)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Expenses</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-destructive">{formatCurrency(profitReport?.total_expenses || 0)}</p></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Profit Trend (Last 30 Days)</CardTitle></CardHeader>
              <CardContent className="h-80">
                {!profitLoading && profitReport?.data ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={profitReport.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(val) => formatDate(val)} />
                      <YAxis tickFormatter={(val) => `Rs ${val / 1000}k`} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} labelFormatter={(label) => formatDate(label)} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" strokeWidth={2} />
                      <Line type="monotone" dataKey="cost" stroke="#ff7300" name="Cost" strokeWidth={2} />
                      <Line type="monotone" dataKey="profit" stroke="#82ca9d" name="Profit" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center">Loading...</div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6 mt-0">
            <h2 className="text-xl font-semibold">Top Selling Products</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Top Products by Revenue</CardTitle></CardHeader>
                <CardContent className="h-[400px]">
                  {!bestSellingLoading && bestSellingReport ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={bestSellingReport} margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickFormatter={(val) => `Rs ${val / 1000}k`} />
                        <YAxis dataKey="product_name" type="category" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Bar dataKey="total_revenue" fill="hsl(var(--primary))" name="Revenue" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center">Loading...</div>}
                </CardContent>
              </Card>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bestSellingReport?.map((item: any) => (
                      <TableRow key={item.product_id}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="text-center font-bold">{item.total_qty}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total_revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}