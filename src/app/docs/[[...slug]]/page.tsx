import { notFound } from "next/navigation";
import Link from "next/link";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const DOCS_DIR = join(process.cwd(), "src/content/docs");

interface DocPageProps {
  params: Promise<{ slug?: string[] }>;
}

function getDocFiles(dir: string, basePath = ""): { slug: string; title: string }[] {
  if (!existsSync(dir)) return [];
  
  const files: { slug: string; title: string }[] = [];
  const items = readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = join(dir, item.name);
    const relativePath = basePath ? `${basePath}/${item.name}` : item.name;

    if (item.isDirectory()) {
      files.push(...getDocFiles(fullPath, relativePath));
    } else if (item.name.endsWith(".md")) {
      const slug = relativePath.replace(/\.md$/, "");
      const content = readFileSync(fullPath, "utf-8");
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1] || slug;
      files.push({ slug, title });
    }
  }

  return files;
}

function getDocContent(slug: string[]): string | null {
  const filePath = join(DOCS_DIR, `${slug.join("/")}.md`);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^# (.+)$/gm, "<h1 class=\"text-2xl font-bold text-slate-100 mb-4\">$1</h1>")
    .replace(/^## (.+)$/gm, "<h2 class=\"text-xl font-semibold text-slate-200 mt-6 mb-3\">$1</h2>")
    .replace(/^### (.+)$/gm, "<h3 class=\"text-lg font-medium text-slate-300 mt-4 mb-2\">$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong class=\"text-slate-200\">$1</strong>")
    .replace(/`(.+?)`/g, "<code class=\"bg-slate-800 px-1.5 py-0.5 rounded text-amber-400 text-sm\">$1</code>")
    .replace(/^- (.+)$/gm, "<li class=\"text-slate-400 ml-4\">$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li class=\"text-slate-400 ml-4\"><span class=\"text-amber-500\">$1.</span> $2</li>")
    .replace(/\n\n/g, "</p><p class=\"text-slate-400 mb-4\">")
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith("<")) return match;
      return `<p class="text-slate-400 mb-4">${match}</p>`;
    });
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;
  const slugPath = slug || ["getting-started"];
  const content = getDocContent(slugPath);

  if (!content) {
    notFound();
  }

  const htmlContent = markdownToHtml(content);
  const allDocs = getDocFiles(DOCS_DIR);

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 overflow-y-auto pr-4 hidden md:block">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Documentation
          </p>
          {allDocs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}`}
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                slugPath.join("/") === doc.slug
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {doc.title}
            </Link>
          ))}
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Link href="/docs">
          <Button variant="ghost" size="sm" className="mb-4 text-slate-400 hover:text-slate-100">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Docs
          </Button>
        </Link>

        <Card className="bg-slate-900 border-slate-800 p-8">
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </Card>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  const docs = getDocFiles(DOCS_DIR);
  return docs.map((doc) => ({
    slug: doc.slug.split("/"),
  }));
}
