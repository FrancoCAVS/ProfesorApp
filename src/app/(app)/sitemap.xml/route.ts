
import { headers } from "next/headers";

const AppRoutes = [
  "calendar",
  "subjects",
  "schedule",
  "absences",
  "reminders",
  "reports",
  "sent-emails",
  "academic-periods",
  "holidays",
  "commemorative-dates",
  "institutions",
  "tools/note-generator",
  "tools/converter",
  "tools/time-converter",
  "tools/user-guide",
];

export async function GET() {
  const headersList = headers();
  const domain = headersList.get("host");

  return new Response(
    `
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${AppRoutes.map(
      (route) => `
    <url>
        <loc>https://${domain}/${route}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1</priority>
    </url>
    `
    ).join("")}
</urlset>`.trim(),
    {
      headers: {
        "Content-Type": "application/xml",
      },
    }
  );
}
