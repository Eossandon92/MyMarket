import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'  // Global styles for your application
import { RouterProvider } from "react-router-dom";  // Import RouterProvider to use the router
import { router } from "./routes";  // Import the router configuration
import { StoreProvider } from './hooks/useGlobalReducer';  // Import the StoreProvider for global state management
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
import { InventoryProvider } from './context/InventoryContext';
import { BackendURL } from './components/BackendURL';

const Main = () => {
    return (
        <React.StrictMode>
            {/* Provide global state to all components */}
            <StoreProvider>
                <AuthProvider>
                    <InventoryProvider>
                        {/* Set up routing for the application */}
                        <RouterProvider router={router} />
                    </InventoryProvider>
                </AuthProvider>
            </StoreProvider>
        </React.StrictMode>
    );
}

// Render the Main component into the root DOM element.
ReactDOM.createRoot(document.getElementById('root')).render(<Main />)
