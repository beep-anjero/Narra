"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/actions";

function SubmitLogout() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" className="h-11" disabled={pending}>
      <LogOut aria-hidden="true" />
      {pending ? "Logging out…" : "Log out"}
    </Button>
  );
}

export function LogoutButton() {
  return (
    <form action={logout}>
      <SubmitLogout />
    </form>
  );
}
