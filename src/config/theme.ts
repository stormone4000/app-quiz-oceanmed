// Theme configuration for the entire application
export const theme = {
  colors: {
    // Brand colors
    brand: {
      primary: {
        light: '#3b82f6', // blue-500
        dark: '#60a5fa'   // blue-400
      },
      secondary: {
        light: '#6366f1', // indigo-500
        dark: '#818cf8'   // indigo-400
      }
    },

    // Background colors
    background: {
      primary: {
        light: '#ffffff',
        dark: '#0f172a'  // slate-900
      },
      secondary: {
        light: '#f8fafc', // slate-50
        dark: '#1e293b'  // slate-800
      },
      glass: {
        light: 'bg-white/20',
        dark: 'bg-slate-800/20'
      }
    },

    // Text colors
    text: {
      primary: {
        light: '#0f172a', // slate-900
        dark: '#f8fafc'   // slate-50
      },
      secondary: {
        light: '#475569', // slate-600
        dark: '#94a3b8'   // slate-400
      },
      muted: {
        light: '#64748b', // slate-500
        dark: '#cbd5e1'   // slate-300
      }
    },

    // Border colors
    border: {
      primary: {
        light: 'border-white/30',
        dark: 'border-slate-700/30'
      },
      secondary: {
        light: '#e2e8f0', // slate-200
        dark: '#334155'   // slate-700
      }
    },

    // Status colors
    status: {
      success: {
        light: '#22c55e', // green-500
        dark: '#4ade80'   // green-400
      },
      error: {
        light: '#ef4444',  // red-500
        dark: '#f87171'    // red-400
      },
      warning: {
        light: '#f59e0b',  // amber-500
        dark: '#fbbf24'    // amber-400
      },
      info: {
        light: '#3b82f6',  // blue-500
        dark: '#60a5fa'    // blue-400
      }
    },

    // Card colors
    card: {
      background: {
        light: 'rgba(255, 255, 255, 0.2)',
        dark: 'rgba(15, 23, 42, 0.2)'  // slate-900 with opacity
      },
      border: {
        light: 'rgba(255, 255, 255, 0.3)',
        dark: 'rgba(148, 163, 184, 0.3)' // slate-400 with opacity
      }
    },

    // Quiz specific colors
    quiz: {
      timer: {
        background: {
          light: 'bg-white/20',
          dark: 'bg-slate-800/20'
        },
        text: {
          light: '#ffffff',
          dark: '#f8fafc'  // slate-50
        },
        progress: {
          background: {
            light: 'bg-white/20',
            dark: 'bg-slate-700/20'
          },
          fill: {
            light: '#3b82f6',  // blue-500
            dark: '#60a5fa'    // blue-400
          }
        }
      },
      question: {
        background: {
          light: 'bg-white/20',
          dark: 'bg-slate-800/20'
        },
        text: {
          light: '#ffffff',
          dark: '#f8fafc'  // slate-50
        }
      },
      answer: {
        default: {
          background: {
            light: 'bg-white/10',
            dark: 'bg-slate-800/10'
          },
          hover: {
            light: 'hover:bg-white/20',
            dark: 'hover:bg-slate-700/20'
          }
        },
        correct: {
          background: {
            light: 'bg-green-100/20',
            dark: 'bg-green-900/20'
          },
          text: {
            light: '#22c55e',  // green-500
            dark: '#4ade80'    // green-400
          }
        },
        incorrect: {
          background: {
            light: 'bg-red-100/20',
            dark: 'bg-red-900/20'
          },
          text: {
            light: '#ef4444',  // red-500
            dark: '#f87171'    // red-400
          }
        }
      }
    }
  },

  // Blur effects
  blur: {
    glass: 'backdrop-blur-lg'
  },

  // Transitions
  transition: {
    default: 'transition-all duration-300',
    fast: 'transition-all duration-150',
    slow: 'transition-all duration-500'
  },

  // Shadows
  shadow: {
    sm: 'shadow-sm',
    default: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl'
  },

  // Border radius
  radius: {
    sm: 'rounded-sm',
    default: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full'
  }
};

// Utility function to get theme value
export const getThemeValue = (path: string, mode: 'light' | 'dark' = 'light'): string => {
  return path.split('.').reduce((obj: any, key: string) => obj?.[key], theme)?.[mode] || '';
};

// CSS class generator for common patterns
export const generateClasses = {
  card: (mode: 'light' | 'dark' = 'light') => `
    ${theme.colors.card.background[mode]}
    ${theme.colors.card.border[mode]}
    ${theme.blur.glass}
    ${theme.shadow.lg}
    ${theme.radius.xl}
  `,
  
  button: (variant: 'primary' | 'secondary' | 'success' | 'error' = 'primary', mode: 'light' | 'dark' = 'light') => `
    ${theme.colors.brand[variant][mode]}
    ${theme.transition.default}
    ${theme.radius.lg}
    px-4 py-2
  `,

  input: (mode: 'light' | 'dark' = 'light') => `
    ${theme.colors.background.primary[mode]}
    ${theme.colors.border.secondary[mode]}
    ${theme.transition.default}
    ${theme.radius.lg}
    px-4 py-2
  `
};