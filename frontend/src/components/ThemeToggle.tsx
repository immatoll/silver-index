import { useState } from "react";
import { getTheme, toggleTheme } from "../states/theme";

/**
 * Dev-only theme toggle, fixed to the bottom-left corner — same
 * placement/style as silver-link's own toggle (see
 * silver-link/app/src/components/DebugConsole.tsx), kept as a floating
 * overlay button outside the normal header/nav layout rather than inline
 * chrome, so it reads as a debug affordance, not a real product setting.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState(getTheme);

  return (
    <button
      type="button"
      className="theme-toggle"
      title="Dev-only theme toggle — not a real product theme"
      style={{ position: "fixed", bottom: 8, left: 8, zIndex: 2000 }}
      onClick={() => setTheme(toggleTheme())}
    >
      {theme === "light" ? "Dark Mode" : "Light Mode"}
    </button>
  );
}
