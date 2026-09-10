import React from "react";
import "../styles/History.css";

const History = ({ history, onBack, onSelect }) => {
  return (
    <div className="history-screen">
      <main className="history-content">
        <header className="history-header">
          <p className="history-eyebrow">Your sessions</p>
          <h1 className="history-title">Decision History</h1>
          <p className="history-subtitle">
            Revisit your past thinking sessions and decision maps.
          </p>
        </header>

        {history.length === 0 ? (
          <div className="history-empty">
            <div className="history-empty__icon" aria-hidden="true">
              —
            </div>
            <h2>No decision history yet</h2>
            <p>Start thinking to create your first decision map.</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((session) => (
              <button
                key={session.id}
                type="button"
                className="history-item"
                onClick={() => onSelect(session)}
              >
                <div className="history-item__main">
                  <div className="history-item-title">
                    {session.title || "Untitled decision"}
                  </div>

                  <div className="history-item-date">
                    {new Date(session.timestamp).toLocaleString()}
                  </div>
                </div>

                <div className="history-item-stats">
                  <span className="history-stat">
                    {session.claims.length} claims
                  </span>
                  <span className="history-stat history-stat--plum">
                    {session.assumptions.length} assumptions
                  </span>
                  <span className="history-stat history-stat--accent">
                    {session.options.length} options
                  </span>
                  <span className="history-stat">
                    {session.criteria.length} criteria
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <footer className="history-footer">
          <button type="button" className="history-back" onClick={onBack}>
            Back to home
          </button>
        </footer>
      </main>
    </div>
  );
};

export default History;
