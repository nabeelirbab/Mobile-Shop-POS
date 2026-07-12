import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { AppProviders } from './providers';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Pos from '@/pages/pos';
import Sales from '@/pages/sales';
import Products from '@/pages/products';
import Categories from '@/pages/categories';
import Customers from '@/pages/customers';
import Suppliers from '@/pages/suppliers';
import Purchases from '@/pages/purchases';
import Expenses from '@/pages/expenses';
import Reports from '@/pages/reports';
import Settings from '@/pages/settings';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/pos" component={Pos} />
      <Route path="/sales" component={Sales} />
      <Route path="/products" component={Products} />
      <Route path="/categories" component={Categories} />
      <Route path="/customers" component={Customers} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/purchases" component={Purchases} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AppProviders>
    </QueryClientProvider>
  );
}

export default App;
