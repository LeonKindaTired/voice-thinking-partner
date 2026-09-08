import React from 'react';

const History = ({ history, onBack, onSelect }) => {
  return (
    <div className="history-screen">
      <div className="history-content">
        <h2>Decision History</h2>
        <p>Your past thinking sessions</p>

        {history.length === 0 ? (
          <div className="history-empty">
            <p>No decision history yet.</p>
            <p>Start thinking to create your first decision map.</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((session) => (
              <div key={session.id} className="history-item" onClick={() => onSelect(session)}>
                <div className="history-item-title">
                  {session.title}
                </div>
                <div className="history-item-date">
                  {new Date(session.timestamp).toLocaleString()}
                </div>
                <div className="history-item-stats">
                  <span>{session.claims.length} claims</span>
                  <span>{session.assumptions.length} assumptions</span>
                  <span>{session.options.length} options</span>
                  <span>{session.criteria.length} criteria</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="history-footer">
          <button onClick={onBack}>Back to home</button>
        </div>
      </div>
    </div>
  );
};

export default History;