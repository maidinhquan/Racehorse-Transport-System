import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import './DashboardLayout.css';

export interface MenuItem {
    label: string;
    path: string;
    icon?: ReactNode;
    badge?: number;
}

interface Props {
    title: string;
    roleLabel: string;
    userName: string;
    menu: MenuItem[];
    headerActions?: ReactNode;
    children: ReactNode;
}

export function DashboardLayout({
    title,
    roleLabel,
    userName,
    menu,
    headerActions,
    children,
}: Props) {
    return (
        <div className="dashboard-layout">
            <aside className="dashboard-sidebar">
                <div className="dashboard-brand">CBN Transport</div>
                <p>{roleLabel}</p>

                <nav aria-label="Menu chính">
                    {menu.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end
                            className={({ isActive }) =>
                                `dashboard-nav-item ${isActive ? 'active' : ''}`
                            }
                        >
                            {item.icon}
                            <span>{item.label}</span>
                            {!!item.badge && <span>{item.badge}</span>}
                        </NavLink>
                    ))}
                </nav>
            </aside>

            <div className="dashboard-main">
                <header className="dashboard-topbar">
                    <h1>{title}</h1>
                    <div className="dashboard-header-actions">
                        {headerActions}
                        <span>{userName}</span>
                    </div>
                </header>

                <main className="dashboard-content">{children}</main>
            </div>
        </div>
    );
}