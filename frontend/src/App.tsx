import AppRouter from "./app/router/AppRouter";
import { ThemeProvider } from "./shared/context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  );
}

export default App;