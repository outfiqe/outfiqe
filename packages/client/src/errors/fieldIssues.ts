type FieldIssue = { path: (string | number)[]; message: string };

const isFieldIssue = (value: unknown): value is FieldIssue =>
  typeof value === "object" &&
  value !== null &&
  "path" in value &&
  Array.isArray(value.path) &&
  "message" in value &&
  typeof value.message === "string";

export const extractFieldIssueMessages = (details: unknown): Record<string, string> => {
  if (!Array.isArray(details)) return {};
  const messagesByField: Record<string, string> = {};
  for (const issue of details) {
    if (!isFieldIssue(issue)) continue;
    const fieldName = issue.path.join(".");
    if (fieldName && !(fieldName in messagesByField)) messagesByField[fieldName] = issue.message;
  }
  return messagesByField;
};
