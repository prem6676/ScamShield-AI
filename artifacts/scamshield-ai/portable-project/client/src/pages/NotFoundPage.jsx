import { Link } from "wouter";
import { EmptyState } from "../components/Shared.jsx";

export default function NotFoundPage() {
  return (
    <EmptyState
      title="That page is not here"
      text="Return to the ScamShield overview or start a new message check."
      action={<Link href="/" className="button button-primary">Back to overview</Link>}
    />
  );
}
