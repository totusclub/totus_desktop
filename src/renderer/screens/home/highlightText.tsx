import React from 'react';

/** Порт UI/highlightText.highlightAllMatches: все вхождения запроса — брендовым цветом. */
export function highlightAllMatches(text: string, query: string, className = 'home-highlight'): React.ReactNode {
  if (!query.trim()) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let searchIndex = 0;
  let key = 0;
  while (searchIndex < text.length) {
    const index = lowerText.indexOf(lowerQuery, searchIndex);
    if (index === -1) {
      parts.push(text.substring(searchIndex));
      break;
    }
    if (index > searchIndex) parts.push(text.substring(searchIndex, index));
    parts.push(
      <span key={`h-${key++}`} className={className}>
        {text.substring(index, index + query.length)}
      </span>,
    );
    searchIndex = index + query.length;
  }
  return <>{parts}</>;
}
