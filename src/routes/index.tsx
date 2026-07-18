import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="container max-w-xl mx-auto">
      lorem ipsum blablablablabla
    </div>
  );
}
