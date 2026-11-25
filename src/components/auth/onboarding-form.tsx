"use client";

import { useActionState } from "react";
import { createProfile, type OnboardingState } from "@/app/onboarding/actions";
import { FormError, FormField, SubmitButton } from "./form-field";

export function OnboardingForm({ suggestedUsername }: { suggestedUsername: string }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(createProfile, {});

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormError message={state.error} />
      <FormField
        label="Name"
        name="displayName"
        autoComplete="name"
        required
        maxLength={50}
        defaultValue={state.values?.displayName}
        error={state.fieldErrors?.displayName}
      />
      <FormField
        label="Username"
        name="username"
        autoComplete="username"
        required
        maxLength={16}
        defaultValue={state.values?.username ?? suggestedUsername}
        hint="3–15 letters, numbers or _. This is your profile link: chirp/username"
        error={state.fieldErrors?.username}
      />
      <SubmitButton pending={pending}>Continue</SubmitButton>
    </form>
  );
}
