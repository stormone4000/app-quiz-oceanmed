import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "./theme-provider"
 
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
 
  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors dark:bg-slate-800/50 dark:hover:bg-slate-700/50 backdrop-blur-sm"
      aria-label={theme === "light" ? "Attiva tema scuro" : "Attiva tema chiaro"}
    >
      {theme === "light" ? (
        <Moon className="w-5 h-5 text-white" />
      ) : (
        <Sun className="w-5 h-5 text-white" />
      )}
    </button>
  )
}