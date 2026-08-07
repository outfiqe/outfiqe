import { UserList } from "@/features/users";

// Home route ("/"). Pages compose features — they don't contain feature
// logic themselves. This currently renders the starter's users list as a
// placeholder; swap in real storefront content (categories, featured
// products) as those features land.
export default function HomePage() {
  return (
    <main>
      <UserList />
    </main>
  );
}
