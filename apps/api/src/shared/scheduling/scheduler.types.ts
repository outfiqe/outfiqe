export type RecurringJob = {
  name: string;
  run: () => Promise<unknown>;
  intervalMs: number;
};
