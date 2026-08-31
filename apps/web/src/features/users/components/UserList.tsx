"use client";

import { Skeleton } from "@outfiqe/design-system";

import { useUsers } from "../hooks/useUsers";

const USER_ROW_PLACEHOLDER_COUNT = 6;

export const UserList = () => {
  const { data: users, isLoading, isError } = useUsers();

  if (isLoading) {
    return (
      <ul className="space-y-2">
        {Array.from({ length: USER_ROW_PLACEHOLDER_COUNT }).map((_, index) => (
          <li key={index}>
            <Skeleton className="h-5 w-64" />
          </li>
        ))}
      </ul>
    );
  }
  if (isError) return <p>Failed to load users.</p>;

  return (
    <ul>
      {users?.map((user) => (
        <li key={user.id}>
          {user.name} — {user.email}
        </li>
      ))}
    </ul>
  );
};
