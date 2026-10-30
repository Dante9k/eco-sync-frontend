// Render all returned values as React text nodes. This is not an HTML sanitizer.
// Rich HTML is intentionally unsupported; do not feed this result to innerHTML.
export const sanitizeText = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
