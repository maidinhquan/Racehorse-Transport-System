import AppRouter from "./app/router/AppRouter";
import { ThemeProvider } from "./shared/context/ThemeContext";
import { ErrorBoundary } from "./shared/components/ErrorBoundary/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;