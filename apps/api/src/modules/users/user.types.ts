// Kept hand-written rather than re-exported from the generated Prisma types,
// so the rest of the app never depends on Prisma directly. Only the
// repository imports Prisma.
export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

// What the API actually returns - never includes passwordHash.
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}
