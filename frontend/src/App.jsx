import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import OrderFormPage from "./pages/OrderFormPage.jsx";
import OrderDetailsPage from "./pages/OrderDetailsPage.jsx";
import PackingPage from "./pages/PackingPage.jsx";
import JobsPage from "./pages/JobsPage.jsx";
import JobFormPage from "./pages/JobFormPage.jsx";
import JobDetailsPage from "./pages/JobDetailsPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import PrintersPage from "./pages/PrintersPage.jsx";
import PrinterFormPage from "./pages/PrinterFormPage.jsx";
import FilamentsPage from "./pages/FilamentsPage.jsx";
import FilamentFormPage from "./pages/FilamentFormPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import ProductFormPage from "./pages/ProductFormPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<OrderFormPage />} />
        <Route path="/orders/:id" element={<OrderDetailsPage />} />
        <Route path="/packing" element={<PackingPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/new" element={<JobFormPage />} />
        <Route path="/jobs/:id/edit" element={<JobFormPage />} />
        <Route path="/jobs/:id" element={<JobDetailsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/printers" element={<PrintersPage />} />
        <Route path="/printers/new" element={<PrinterFormPage />} />
        <Route path="/printers/:id/edit" element={<PrinterFormPage />} />
        <Route path="/filaments" element={<FilamentsPage />} />
        <Route path="/filaments/new" element={<FilamentFormPage />} />
        <Route path="/filaments/:id/edit" element={<FilamentFormPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<ProductFormPage />} />
        <Route path="/products/:id/edit" element={<ProductFormPage />} />
      </Route>
    </Routes>
  );
}
