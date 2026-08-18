import { Button } from "@outfiqe/design-system";
import { FileQuestion } from "lucide-react";
import Link from "next/link";

const NotFound = () => (
  <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
    <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-muted">
      <FileQuestion className="size-8 text-muted-foreground" />
    </div>
    <h2 className="mb-2 text-2xl font-semibold text-foreground sm:text-3xl">Page not found</h2>
    <p className="mb-6 max-w-md text-sm text-muted-foreground">
      The page you&apos;re looking for doesn&apos;t exist or may have moved.
    </p>
    <Button asChild>
      <Link href="/">Go home</Link>
    </Button>
  </div>
);

export default NotFound;
