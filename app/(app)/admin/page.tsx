import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getBudgetSnapshot } from "@/lib/budget";
import { formatCurrency, initials } from "@/lib/format";
import { BudgetForm } from "./budget-form";
import { InviteModal } from "./invite-modal";
import { RoleSelect } from "./role-select";
import { ToggleActiveButton } from "./toggle-active-button";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  if (profile.role !== "executive") {
    redirect("/groceries/wishlist");
  }

  const supabase = await createClient();
  const [{ budget }, { data: profiles }] = await Promise.all([
    getBudgetSnapshot(),
    supabase.from("profiles").select("*").order("full_name"),
  ]);

  const team = profiles ?? [];

  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-base font-semibold text-text">Budget settings</h1>
        <p className="mb-4 text-sm text-text-muted">
          Current monthly budget: <strong>{formatCurrency(budget)}</strong>
        </p>
        <BudgetForm currentBudget={budget} />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text">Team & permissions</h2>
            <p className="mt-0.5 text-sm text-text-muted">
              Invite teammates or change a person&rsquo;s role. Only executives can do this.
            </p>
          </div>
          <InviteModal />
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[#fafbfc]">
                <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Name
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Email
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Role
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Status
                </th>
                <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {team.map((person) => {
                const isSelf = person.id === profile.id;
                return (
                  <tr key={person.id} className="border-b border-border last:border-0 hover:bg-[#fafbfc]">
                    <td className="px-3.5 py-3">
                      <span className="mr-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                        {initials(person.full_name)}
                      </span>
                      <span className="font-medium text-text">{person.full_name}</span>
                      {isSelf && <span className="ml-1.5 text-xs text-text-subtle">(you)</span>}
                    </td>
                    <td className="px-3.5 py-3 text-text-muted">{person.email}</td>
                    <td className="px-3.5 py-3">
                      <RoleSelect userId={person.id} currentRole={person.role} />
                    </td>
                    <td className="px-3.5 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          person.is_active ? "bg-success-soft text-success" : "bg-bg text-text-muted"
                        }`}
                      >
                        {person.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <ToggleActiveButton userId={person.id} isActive={person.is_active} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
