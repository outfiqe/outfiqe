export type Job = {
  name: string;
  run: () => Promise<unknown>;
};

export type RecurringJob = Job & {
  intervalMs: number;
};

export type BoundaryJob = Job & {
  nextRunAt: (now: Date) => Date;
};
