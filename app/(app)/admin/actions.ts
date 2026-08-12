"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/profile";
import type { Enums } from "@/lib/types";

export type SetBudgetActionState = {
  error?: string;
  success?: boolean;
};

export async function setBudget(
  _prevState: SetBudgetActionState,
  formData: FormData,
): Promise<SetBudgetActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid budget amount." };
  }

  const { error } = await supabase.from("budget_settings").insert({
    amount,
    set_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/wishlist");
  revalidatePath("/orders");
  revalidatePath("/approvals");
  return { success: true };
}

export async function updateUserRole(userId: string, role: Enums<"user_role">) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .select("id");

  if (error) {
    // Surfaces the last-executive-removal trigger's message verbatim, if that's what fired.
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error("That role change wasn't applied — you may not have permission.");
  }

  revalidatePath("/admin");
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error("That change wasn't applied — you may not have permission.");
  }

  revalidatePath("/admin");
}

export type InviteActionState = {
  error?: string;
  success?: boolean;
};

export async function inviteUser(
  _prevState: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  // The admin client bypasses RLS entirely, so this action must enforce the
  // executive-only rule itself before ever touching it.
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "executive") {
    return { error: "Only executives can invite new teammates." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "staff") as Enums<"user_role">;

  if (!email || !fullName) {
    return { error: "Name and email are required." };
  }

  const host = (await headers()).get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
    redirectTo: `${origin}/auth/callback`,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { success: true };
}
