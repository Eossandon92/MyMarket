import { Outlet } from "react-router-dom/dist"
import ScrollToTop from "../components/ScrollToTop"

// Base component that acts as the shell
export const Layout = () => {
    return (
        <ScrollToTop>
            <Outlet />
        </ScrollToTop>
    )
}