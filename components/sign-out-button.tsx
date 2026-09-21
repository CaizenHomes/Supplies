import { signOut } from "@/lib/auth-actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex min-h-11 items-center text-sm text-text-muted hover:text-text sm:min-h-0"
      >
        Sign out
      </button>
    </form>
  );
}
