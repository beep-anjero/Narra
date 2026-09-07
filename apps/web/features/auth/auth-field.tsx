"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthFieldProps = {
  name: "email" | "password" | "confirmPassword";
  label: string;
  autoComplete: "email" | "current-password" | "new-password";
  errors?: string[];
  hint?: string;
};

export function AuthField({ name, label, autoComplete, errors, hint }: AuthFieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = name !== "email";
  const message = errors?.[0] ?? hint;
  return (
    <div className="space-y-2.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input
          id={name}
          name={name}
          required
          maxLength={isPassword ? 128 : 254}
          type={isPassword && !visible ? "password" : isPassword ? "text" : "email"}
          autoComplete={autoComplete}
          spellCheck={false}
          autoCapitalize="none"
          aria-invalid={Boolean(errors?.length)}
          aria-describedby={message ? `${name}-help` : undefined}
          className={`h-12 bg-white text-base ${isPassword ? "pr-12" : ""}`}
        />
        {isPassword && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-0.5 right-0.5 size-11"
            aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        )}
      </div>
      {message && (
        <p
          id={`${name}-help`}
          className={`text-sm leading-relaxed ${errors?.length ? "text-destructive" : "text-muted-foreground"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
