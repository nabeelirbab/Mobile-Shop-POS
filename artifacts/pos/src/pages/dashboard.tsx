import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useGetDashboard, useGetSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, TrendingUp, DollarSign, Package, Users, AlertTriangle, Receipt } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();
  const { data: settings } = useGetSettings();
  const currency = settings?.currency || "Rs.";

  if (isLoading || !dashboard) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-20"></CardHeader>
                <CardContent className="h-10"></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  const statCards = [
    { title: "Today's Sales", value: formatCurrency(dashboard.today_sales), icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Monthly Sales", value: formatCurrency(dashboard.monthly_sales), icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Monthly Profit", value: formatCurrency(dashboard.monthly_profit), icon: DollarSign, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { title: "Low Stock Items", value: dashboard.low_stock_count, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  const secondaryCards = [
    { title: "Total Products", value: dashboard.total_products, icon: Package },
    { title: "Total Customers", value: dashboard.total_customers, icon: Users },
    { title: "Today's Invoices", value: dashboard.today_sales_count, icon: Receipt },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                  <h3 className="text-2xl font-bold">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-full ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.recent_sales?.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.invoice_no}</TableCell>
                        <TableCell>{new Date(sale.created_at || '').toLocaleTimeString()}</TableCell>
                        <TableCell>{sale.customer_name || 'Walk-in'}</TableCell>
                        <TableCell>{formatCurrency(sale.grand_total)}</TableCell>
                        <TableCell>
                          <Badge variant={sale.status === 'completed' ? 'default' : 'destructive'}>
                            {sale.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!dashboard.recent_sales || dashboard.recent_sales.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          No sales today
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <AlertTriangle className="w-5 h-5" /> Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboard.low_stock_products?.slice(0, 5).map(product => (
                    <div key={product.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.barcode || product.model}</p>
                      </div>
                      <Badge variant="destructive" className="ml-2">
                        {product.stock_qty} left
                      </Badge>
                    </div>
                  ))}
                  {(!dashboard.low_stock_products || dashboard.low_stock_products.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center">No low stock items</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              {secondaryCards.map((stat, i) => (
                <Card key={i}>
                  <CardContent className="p-4 text-center">
                    <stat.icon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <h4 className="text-xl font-bold">{stat.value}</h4>
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

