import { redirect } from "next/navigation";

export default function LegacyDashboardRedirect() {
  redirect("https://paopaoracing.vercel.app/admin");
}
