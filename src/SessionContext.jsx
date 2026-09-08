import React, { createContext, useReducer, useContext } from 'react';

const initialState = {
  claims: [],
  assumptions: [],
  options: [],
  criteria: [],
};

function sessionReducer(state, action) {
  switch (action.type) {
    case 'ADD_CLAIM':
      return {
        ...state,
        claims: [...state.claims, { id: Date.now(), text: action.payload.text, hasEvidence: action.payload.hasEvidence }],
      };
    case 'ADD_ASSUMPTION':
      return {
        ...state,
        assumptions: [...state.assumptions, { id: Date.now(), text: action.payload.text }],
      };
    case 'ADD_OPTION':
      return {
        ...state,
        options: [...state.options, { id: Date.now(), text: action.payload.text }],
      };
    case 'ADD_CRITERION':
      return {
        ...state,
        criteria: [...state.criteria, { id: Date.now(), text: action.payload.text }],
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  const logClaim = (text, hasEvidence) => {
    dispatch({ type: 'ADD_CLAIM', payload: { text, hasEvidence } });
  };

  const logAssumption = (text) => {
    dispatch({ type: 'ADD_ASSUMPTION', payload: { text } });
  };

  const logOption = (text) => {
    dispatch({ type: 'ADD_OPTION', payload: { text } });
  };

  const logCriterion = (text) => {
    dispatch({ type: 'ADD_CRITERION', payload: { text } });
  };

  const resetSession = () => {
    dispatch({ type: 'RESET' });
  };

  return (
    <SessionContext.Provider value={{
      claims: state.claims,
      assumptions: state.assumptions,
      options: state.options,
      criteria: state.criteria,
      logClaim,
      logAssumption,
      logOption,
      logCriterion,
      resetSession,
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};