import {Moon, Sun} from "lucide-react";
import {useTheme} from "../../hooks/useTheme.ts";

export function LightDarkModeSelector({}) {
  const [theme, setTheme] = useTheme();
  const onClick = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return <button
    onClick={onClick}
    className="p-2 rounded-lg hover:bg-zinc-900/50 transition-colors text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] cursor-pointer"
    title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
  >
    {theme === "dark" ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
  </button>;
}