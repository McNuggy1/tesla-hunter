import { redirect } from "next/navigation";

// For MVP, the homepage IS the search page
export default function HomePage() {
  redirect("/search");
}
