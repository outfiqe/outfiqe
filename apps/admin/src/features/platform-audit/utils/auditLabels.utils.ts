const CODE_WORD_SEPARATORS = /[._-]+/g;

export const toPlainAuditLabel = (code: string): string => {
  const words = code.replace(CODE_WORD_SEPARATORS, " ").trim().toLowerCase();
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};
