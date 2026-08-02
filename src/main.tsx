import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./index.css";
import { StoreProvider, isAuthed } from "./lib/store";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { BusinessDetail } from "./pages/BusinessDetail";
import { PortfolioSheet } from "./pages/PortfolioSheet";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  if (!isAuthed()) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/app"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/app/sheet"
            element={
              <RequireAuth>
                <PortfolioSheet />
              </RequireAuth>
            }
          />
          <Route
            path="/app/b/:id"
            element={
              <RequireAuth>
                <BusinessDetail />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
);
