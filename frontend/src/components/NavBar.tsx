import { NavLink } from "react-router-dom";

export default function NavBar() {
    return (
        <header className="header">
            <div className="brand">
                <span className="brand-name">
                    Silver<span className="brand-name-accent">Link</span> Indexer
                </span>
                <span className="brand-tag">EVE Frontier Data Control</span>
            </div>

            <nav className="nav">
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                        isActive ? "step nav-link nav-link--active" : "step nav-link"
                    }
                >
                    Sync
                </NavLink>

                <NavLink
                    to="/world-data"
                    className={({ isActive }) =>
                        isActive ? "step nav-link nav-link--active" : "step nav-link"
                    }
                >
                    World Data
                </NavLink>

                <NavLink
                    to="/silver-link"
                    className={({ isActive }) =>
                        isActive ? "step nav-link nav-link--active" : "step nav-link"
                    }
                >
                    Silver Link
                </NavLink>
            </nav>

            <div className="tag tag--green">
                <div className="dot" />
                ONLINE
            </div>
        </header>
    );
}
