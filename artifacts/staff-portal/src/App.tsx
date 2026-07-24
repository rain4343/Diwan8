import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { Shell } from '@/components/layout/Shell';
import { AuthProvider, useAuth } from '@/lib/auth';
import { hasPermission, hasModuleAccess } from '@/lib/usePermission';

import Dashboard from '@/pages/Dashboard';
import StaffList from '@/pages/StaffList';
import StaffForm from '@/pages/StaffForm';
import Departments from '@/pages/Departments';
import DepartmentDetail from '@/pages/DepartmentDetail';
import SystemAdmin from '@/pages/SystemAdmin';
import Documents from '@/pages/Documents';
import DocumentForm from '@/pages/DocumentForm';
import DocumentDetail from '@/pages/DocumentDetail';
import DocumentSign from '@/pages/DocumentSign';
import Profile from '@/pages/Profile';
import Chat from '@/pages/Chat';
import Login from '@/pages/Login';
import Reports from '@/pages/Reports';
import Leaves from '@/pages/Leaves';
import NotificationsPage from '@/pages/NotificationsPage';

const queryClient = new QueryClient();

function ProtectedRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Permission guards — system admin always passes
  const can = (module: string, action: string) => hasPermission(user, module, action);
  const canSee = (module: string) => hasModuleAccess(user, module);

  return (
    <Shell>
      <Switch>
        {/* Always accessible */}
        <Route path="/" component={Dashboard} />
        <Route path="/chat" component={Chat} />
        <Route path="/profile" component={Profile} />
        <Route path="/notifications" component={NotificationsPage} />

        {/* Staff / users */}
        <Route path="/staff">
          {canSee('users') ? <StaffList /> : <Redirect to="/" />}
        </Route>
        <Route path="/staff/new">
          {user.is_system_admin || can('users', 'create') ? <StaffForm /> : <Redirect to="/staff" />}
        </Route>
        <Route path="/staff/:id">
          {user.is_system_admin || can('users', 'update') ? <StaffForm /> : <Redirect to="/staff" />}
        </Route>

        {/* Departments */}
        <Route path="/departments">
          {canSee('departments') ? <Departments /> : <Redirect to="/" />}
        </Route>
        <Route path="/departments/:id">
          {canSee('departments') ? <DepartmentDetail /> : <Redirect to="/" />}
        </Route>

        {/* Documents */}
        <Route path="/documents">
          {canSee('documents') ? <Documents /> : <Redirect to="/" />}
        </Route>
        <Route path="/documents/new">
          {can('documents', 'create') ? <DocumentForm /> : <Redirect to="/documents" />}
        </Route>
        <Route path="/documents/:id/sign">
          {canSee('documents') ? <DocumentSign /> : <Redirect to="/documents" />}
        </Route>
        <Route path="/documents/:id/edit">
          {can('documents', 'update') ? <DocumentForm /> : <Redirect to="/documents" />}
        </Route>
        <Route path="/documents/:id">
          {canSee('documents') ? <DocumentDetail /> : <Redirect to="/" />}
        </Route>

        {/* Reports */}
        <Route path="/reports">
          {canSee('reports') ? <Reports /> : <Redirect to="/" />}
        </Route>

        {/* Leaves / cases */}
        <Route path="/leaves">
          {canSee('cases') ? <Leaves /> : <Redirect to="/" />}
        </Route>

        {/* System admin only */}
        <Route path="/roles">
          {user.is_system_admin ? <SystemAdmin /> : <Redirect to="/" />}
        </Route>
        <Route path="/admin">
          {user.is_system_admin ? <SystemAdmin /> : <Redirect to="/" />}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <ProtectedRouter />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
