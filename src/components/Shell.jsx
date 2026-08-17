import { NavLink, Outlet } from "react-router-dom";
import { Home, Lock, Users, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Shell() {
  const { profile, isSuperAdmin, logout } = useAuth();

  const navItems = [
    { to: "/", label: "Início", icon: Home, end: true },
    { to: "/conta", label: "Minha Conta", icon: Lock },
    ...(isSuperAdmin ? [{ to: "/usuarios", label: "Usuários", icon: Users }] : []),
  ];

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand-mark">
          <div className="brand-ring">DKP</div>
          <div>
            <p className="brand-title">Portal DKP</p>
            <p className="brand-sub">Deutscher Klub Pernambuco</p>
          </div>
        </div>
        <div className="topbar-user">
          <span className="topbar-user-name">{profile?.nome}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout} title="Sair">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <div className="app-body">
        <nav className="sidenav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidenav-item ${isActive ? "sidenav-item-active" : ""}`}
            >
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="bottomnav">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `bottomnav-item ${isActive ? "bottomnav-item-active" : ""}`}
          >
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
