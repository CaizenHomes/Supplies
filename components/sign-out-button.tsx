import { signOut } from "@/lib/auth-actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-sm text-text-muted hover:text-text">
        Sign out
      </button>
    </form>
  );
}
