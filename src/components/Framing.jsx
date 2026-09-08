import React, { useState } from 'react';

const Framing = ({ onSkip, onComplete }) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim() !== '') {
      onComplete(title);
    }
  };

  return (
    <div className="framing-screen">
      <div className="framing-content">
        <h2>What are you deciding?</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Whether to take the job offer"
            autoFocus
          />
          <div className="button-group">
            <button type="button" onClick={onSkip}>
              Skip
            </button>
            <button type="submit">
              Start
            </button>
          </div>
        </form>
        <p>Optional: typing your decision helps clarify it in the final artifact.</p>
      </div>
    </div>
  );
};

export default Framing;