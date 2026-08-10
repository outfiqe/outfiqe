"use client";

import { useUsers } from "../hooks/useUsers";

export const UserList = () => {
  const { data: users, isLoading, isError } = useUsers();

  if (isLoading) return <p>Loading users...</p>;
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
