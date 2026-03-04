// Import necessary components and functions from react-router-dom.
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { ProductMaintenance } from "./pages/ProductMaintenance";
import { CategoryMaintenance } from "./pages/CategoryMaintenance";
import { Reports } from "./pages/Reports";
import { CashRegister } from "./pages/CashRegister";
import { AddStock } from "./pages/AddStock";
import { Login } from "./pages/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/">
      {/* Public Routes */}
      <Route path="login" element={<Login />} />

      {/* Protected Routes inside Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
        errorElement={<h1>Not found!</h1>}
      >
        <Route index element={<Home />} />
        <Route path="admin/products" element={<ProductMaintenance />} />
        <Route path="admin/categories" element={<CategoryMaintenance />} />
        <Route path="admin/reports" element={<Reports />} />
        <Route path="admin/cash-register" element={<CashRegister />} />
        <Route path="admin/add-stock" element={<AddStock />} />
      </Route>
    </Route>
  )
);