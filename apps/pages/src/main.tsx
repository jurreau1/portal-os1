import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { GovernorLayout } from "./layouts/GovernorLayout";
import { MainLayout } from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Portfolio from "./pages/Portfolio";
import Pipeline from "./pages/Pipeline";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Approvals from "./pages/Approvals";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import "./style.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GovernorLayout>
      <BrowserRouter>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route
              path="*"
              element={
                <>
                  <h1>Page not found</h1>
                  <Link to="/">Return to dashboard</Link>
                </>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </GovernorLayout>
  </StrictMode>,
);
