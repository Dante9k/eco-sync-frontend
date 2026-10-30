import { useState } from 'react';
export function useExpandableText(value: string, limit = 200) {
  const [expanded, setExpanded] = useState(false);
  const long = value.length > limit;
  return { expanded, long, text: long && !expanded ? `${value.slice(0, limit)}…` : value, toggle: () => setExpanded(current => !current) };
}
