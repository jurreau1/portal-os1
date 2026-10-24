import { Link } from "react-router-dom";
export function Header() {
  return (
    <header className="header">
      <div className="breadcrumb">
        Workspace <span>/</span> <strong>Governor console</strong>
      </div>
      <div className="header-actions">
        <span className="environment">GOVERNOR</span>
        <Link className="avatar" to="/settings" aria-label="Governor settings">
          G
        </Link>
      </div>
    </header>
  );
}
