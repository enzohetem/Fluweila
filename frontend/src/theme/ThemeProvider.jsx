import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "fila3d-theme";

export function ThemeProvider({ children }) {
  const [themePreference, setThemePreferenceState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "system";
  });
  const [systemTheme, setSystemTheme] = useState(() => getSystemTheme());

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function syncSystemTheme(event) {
      setSystemTheme(event.matches ? "dark" : "light");
    }

    media.addEventListener("change", syncSystemTheme);

    return () => {
      media.removeEventListener("change", syncSystemTheme);
    };
  }, []);

  const activeTheme = themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
    document.documentElement.dataset.themePreference = themePreference;
    document.documentElement.style.colorScheme = activeTheme;
  }, [activeTheme, themePreference]);

  function setThemePreference(nextTheme) {
    setThemePreferenceState(nextTheme);

    if (nextTheme === "system") {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, nextTheme);
  }

  const value = useMemo(
    () => ({
      activeTheme,
      themePreference,
      setThemePreference,
    }),
    [activeTheme, themePreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider.");
  }

  return context;
}

function getSystemTheme() {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}
