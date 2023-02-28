export function getLocalized(v) {
  if (typeof v === 'string') return v;
  return v?.default || Object.values(v)[0];
}