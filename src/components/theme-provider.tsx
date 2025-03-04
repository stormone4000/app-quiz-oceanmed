import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => {
      const savedTheme = localStorage.getItem(storageKey) as Theme
      console.log("Tema inizializzato:", savedTheme || defaultTheme)
      return (savedTheme || defaultTheme)
    }
  )

  useEffect(() => {
    const root = window.document.documentElement
    
    // Rimuovo prima tutte le classi di tema
    root.classList.remove('light', 'dark')
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? 'dark'
        : 'light'
      
      console.log("Tema di sistema rilevato:", systemTheme)
      root.classList.add(systemTheme)
    } else {
      console.log("Applicazione tema esplicito:", theme)
      root.classList.add(theme)
    }
    
    // Salvo il tema in localStorage
    localStorage.setItem(storageKey, theme)
    console.log("Tema salvato in localStorage:", theme)
    
    // Debug: verifico che le classi siano state applicate
    console.log("Classi attuali sul documento:", root.classList.toString())
  }, [theme, storageKey])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      console.log("setTheme chiamato con:", newTheme)
      setTheme(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}