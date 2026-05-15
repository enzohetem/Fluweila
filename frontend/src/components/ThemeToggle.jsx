import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider.jsx";

const options = [
  { value: "system", label: "Sistema", icon: Laptop },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
];

export default function ThemeToggle() {
  const { themePreference, setThemePreference } = useTheme();

  return (
    <div className="theme-toggle" aria-label="Tema da interface">
      {options.map((option) => {
        const Icon = option.icon;
        const active = themePreference === option.value;

        return (
          <button
            key={option.value}
            className={active ? "active" : ""}
            type="button"
            title={option.label}
            aria-label={option.label}
            aria-pressed={active}
            onClick={() => setThemePreference(option.value)}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
