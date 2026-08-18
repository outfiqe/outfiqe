import { Button } from "@outfiqe/design-system";
import Link from "next/link";

const NotFound = () => (
  <div className="mx-auto my-10 max-w-md px-6 text-center">
    <h2 className="mb-2 text-xl font-semibold text-foreground">Page not found</h2>
    <p className="mb-4 text-sm text-muted-foreground">
      The page you&apos;re looking for doesn&apos;t exist or may have moved.
    </p>
    <Button asChild>
      <Link href="/">Go home</Link>
    </Button>
  </div>
);

export default NotFound;
