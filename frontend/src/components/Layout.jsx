import {
  Archive,
  Boxes,
  Home,
  Package,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  ShoppingBag,
  ScrollText,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";
import FluewilaLogo from "./FluewilaLogo.jsx";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/orders", label: "Pedidos", icon: ShoppingBag },
  { to: "/jobs", label: "Fila", icon: ScrollText },
  { to: "/packing", label: "Embalagem", icon: PackageCheck },
  { to: "/products", label: "Produtos", icon: Package },
  { to: "/history", label: "Histórico", icon: Archive },
  { to: "/printers", label: "Impressoras", icon: Printer },
  { to: "/filaments", label: "Filamentos", icon: Boxes },
];

export default function Layout() {
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const ToggleIcon = sidebarCompact ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className={`app-shell ${sidebarCompact ? "sidebar-compact" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <FluewilaLogo size={24} />
          <div className="brand-text">
            <strong>Fluweila</strong>
          </div>
          <button
            className="sidebar-toggle"
            type="button"
            title={sidebarCompact ? "Expandir menu" : "Recolher menu"}
            aria-label={sidebarCompact ? "Expandir menu" : "Recolher menu"}
            onClick={() => setSidebarCompact((current) => !current)}
          >
            <ToggleIcon size={18} />
          </button>
        </div>

        <nav className="nav-list" aria-label="Navegação principal">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink key={item.to} to={item.to} className="nav-item" title={item.label}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <ThemeToggle />
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
