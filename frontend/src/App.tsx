import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import { ThemeToggle } from "./components/ThemeToggle";
import SyncPage from "./pages/Sync";
import EntityExplorer from "./pages/EntityExplorer";
import "./App.css";

export default function App() {
    return (
        <BrowserRouter>
            <main className="app">
                <NavBar />

                <Routes>
                    <Route path="/" element={<SyncPage />} />
                    <Route
                        path="/world-data"
                        element={<EntityExplorer catalog="world" title="World Data" />}
                    />
                    <Route
                        path="/silver-link"
                        element={<EntityExplorer catalog="silverlink" title="Silver Link" />}
                    />
                </Routes>
            </main>

            <ThemeToggle />
        </BrowserRouter>
    );
}
