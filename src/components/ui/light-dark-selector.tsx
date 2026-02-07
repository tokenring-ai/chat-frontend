import {Moon, Sun} from "lucide-react";
import {useTheme} from "../../hooks/useTheme.ts";

export function LightDarkSelector({}) {
  const [theme, setTheme] = useTheme();
  const onClick = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return <button
    onClick={onClick}
    className="p-2 rounded-lg hover:bg-hover transition-colors text-muted focus-ring cursor-pointer"
    title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
  >
    {theme === "dark" ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
  </button>;
}