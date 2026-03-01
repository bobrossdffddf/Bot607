import { Switch, Route } from "wouter";

function Router() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <h1 className="text-white text-2xl font-bold">Bot is running.</h1>
    </div>
  );
}

function App() {
  return (
    <Router />
  );
}

export default App;
