import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "加入我们" };

// Legacy page — redirects to the membership guide.
// Use /guide for the full onboarding flow (six-step process + FAQ + CTA).
export default function ApplyPage() {
  redirect("/guide");
}