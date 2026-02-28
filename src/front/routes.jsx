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

export const router = createBrowserRouter(
  createRoutesFromElements(
    // Root Route: All navigation will start from here.
    <Route path="/" element={<Layout />} errorElement={<h1>Not found!</h1>} >
      {/* Nested Routes: Defines sub-routes within the BaseHome component. */}
      <Route path="/" element={<Home />} />
      <Route path="/admin/products" element={<ProductMaintenance />} />
      <Route path="/admin/categories" element={<CategoryMaintenance />} />
    </Route>
  )
);