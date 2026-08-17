import { createRoot } from "react-dom/client";

import {
    ThemeProvider,
    createTheme
} from "@mui/material/styles";

import App from "./App.tsx";
import { applyStoredTheme } from "./states/theme";

// Applied synchronously before the first render (direct DOM mutation, not
// a React effect) so there's no flash of the wrong theme on load — same
// approach silver-link's own light-mode toggle uses.
applyStoredTheme();


const theme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#ff9640"
        },
        secondary: {
            main: "#5fd67f"
        },
        background: {
            default: "#0d0e0f",
            paper: "#121314"
        },
        text: {
            primary: "#c7c7c7",
            secondary: "#8c8c8c"
        }
    },
    shape: {
        borderRadius: 2
    },
    typography: {
        fontFamily: '"Chakra Petch", "Segoe UI", system-ui, -apple-system, sans-serif'
    }
});


createRoot(
    document.getElementById("root")!
).render(
    <ThemeProvider theme={theme}>
        <App />
    </ThemeProvider>
);