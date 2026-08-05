import { createRoot } from "react-dom/client";

import {
    ThemeProvider,
    createTheme
} from "@mui/material/styles";

import App from "./App.tsx";


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