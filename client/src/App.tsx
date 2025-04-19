import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { NostrProvider } from "@/context/nostr-provider";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Listing from "@/pages/listing";
import About from "@/pages/about";
import SupportPage from "@/pages/support";
import CommunityPage from "@/pages/community";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create-listing" component={Listing} />
      <Route path="/about" component={About} />
      <Route path="/support" component={SupportPage} />
      <Route path="/help" component={SupportPage} />
      <Route path="/safety" component={SupportPage} />
      <Route path="/cancellation" component={SupportPage} />
      <Route path="/community" component={CommunityPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NostrProvider>
        <Router />
        <Toaster />
      </NostrProvider>
    </QueryClientProvider>
  );
}

export default App;
