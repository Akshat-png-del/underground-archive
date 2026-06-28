import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articles, getArticle, categoryLabels } from "@/content/editorial";
import { buildMetadata } from "@/lib/seo/metadata";
import { articleSchema, breadcrumbSchema } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { SectionLabel } from "@/components/ui/ArchivePrimitives";
import { SafeImage } from "@/components/ui/SafeImage";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return buildMetadata({
    title: article.title,
    description: article.excerpt,
    path: `/editorial/${slug}`,
  });
}

export default async function EditorialArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const paragraphs = article.content.split("\n\n");

  return (
    <>
      <JsonLd
        data={[
          articleSchema({
            title: article.title,
            description: article.excerpt,
            path: `/editorial/${slug}`,
            publishedAt: article.publishedAt,
            image: article.heroImage,
          }),
          breadcrumbSchema([
            { name: "Editorial", path: "/editorial" },
            { name: article.title, path: `/editorial/${slug}` },
          ]),
        ]}
      />

      <article>
        <section className="relative h-[50vh]">
          <SafeImage src={article.heroImage} alt="" fill className="opacity-35" priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
          <div className="relative mx-auto flex h-full max-w-3xl flex-col justify-end px-4 pb-12 sm:px-6">
            <SectionLabel>{categoryLabels[article.category]}</SectionLabel>
            <h1 className="mt-3 font-serif text-4xl text-foreground sm:text-5xl">{article.title}</h1>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted">
              {article.author} · {article.publishedAt} · {article.readTime} min
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <p className="text-xl leading-relaxed text-muted-light">{article.excerpt}</p>
          <div className="prose-archive mt-12">
            {paragraphs.map((block) => {
              if (block.startsWith("## ")) {
                return <h2 key={block}>{block.replace("## ", "")}</h2>;
              }
              if (block.startsWith("- ")) {
                const items = block.split("\n").filter((l) => l.startsWith("- "));
                return (
                  <ul key={block} className="my-4 space-y-2">
                    {items.map((item) => (
                      <li key={item} className="text-muted-light">— {item.replace("- ", "")}</li>
                    ))}
                  </ul>
                );
              }
              return <p key={block.slice(0, 40)}>{block}</p>;
            })}
          </div>
        </div>
      </article>
    </>
  );
}
