import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import './forge.css';

const STEPS = [
  { key: 'brief', label: 'Prompt', match: /\/forge\/?$/ },
  { key: 'pipeline', label: 'Agents', match: /\/forge\/pipeline/ },
  { key: 'results', label: 'Alternatives', match: /\/forge\/results/ },
  { key: 'inspect', label: 'Inspect', match: /\/forge\/inspect/ },
  { key: 'export', label: 'Export', match: /\/forge\/export/ },
];

export const ForgeShell: React.FC = () => {
  const { pathname } = useLocation();
  const active = STEPS.findIndex((s) => s.match.test(pathname));

  return (
    <div className="forge-app">
      <header className="forge-top">
        <Link to="/forge" className="forge-brand">
          <span className="forge-brand-mark">G</span>
          Genesis Forge
        </Link>
        <ol className="forge-steps" aria-label="Design journey">
          {STEPS.map((s, i) => (
            <li key={s.key} className={i === active ? 'is-active' : i < active ? 'is-done' : ''}>
              {s.label}
            </li>
          ))}
        </ol>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <NavLink to="/forge/memory" className="forge-nav-link">
            Memory
          </NavLink>
          <Link to="/" className="forge-nav-link muted">
            ← Hangar
          </Link>
        </nav>
      </header>
      <div className="forge-body">
        <Outlet />
      </div>
    </div>
  );
};
