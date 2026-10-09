import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Router, Switch } from "wouter";
import AppShell from "./components/AppShell.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import AnalyzePage from "./pages/AnalyzePage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import ScanDetailPage from "./pages/ScanDetailPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function Pages() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/scan" component={AnalyzePage} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/scans/:id" component={ScanDetailPage} />
        <Route path="/about" component={AboutPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </AppShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Pages />
      </Router>
    </QueryClientProvider>
  );
}
