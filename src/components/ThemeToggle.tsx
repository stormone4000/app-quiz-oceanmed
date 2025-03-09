import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "./theme-provider"
 
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
 
  const toggleTheme = () => {
    console.log(`Cambio tema da ${theme} a ${theme === "light" ? "dark" : "light"}`)
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-colors backdrop-blur-sm shadow-md ${
        theme === "light" 
          ? "bg-slate-200 hover:bg-slate-300 border border-slate-300" 
          : "bg-slate-800/50 hover:bg-slate-700/50"
      }`}
      aria-label={theme === "light" ? "Attiva tema scuro" : "Attiva tema chiaro"}
    >
      {theme === "light" ? (
        <Moon className="w-5 h-5 text-slate-700" />
      ) : (
        <Sun className="w-5 h-5 text-yellow-400" />
      )}
    </button>
  )
}