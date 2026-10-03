import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  // If unauthenticated, redirect straight to the login screen
  if (!session) {
    redirect("/login");
  }

  // If already authenticated, redirect to the dashboard
  redirect("/dashboard");
}
