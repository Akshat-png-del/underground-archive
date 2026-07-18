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
        <section className="relative isolate min-h-[min(50vh,28rem)] overflow-hidden sm:min-h-[50vh]">
          <div className="absolute inset-0">
            <SafeImage
              src={article.heroImage}
              alt=""
              fill
              className="object-cover opacity-35"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/75 to-background" />
          </div>
          <div className="relative z-10 mx-auto flex min-h-[min(50vh,28rem)] max-w-3xl flex-col justify-end px-4 pb-10 pt-28 sm:min-h-[50vh] sm:px-6 sm:pb-12">
            <SectionLabel>{categoryLabels[article.category]}</SectionLabel>
            <h1 className="mt-3 max-w-full break-words font-serif text-3xl leading-tight text-foreground sm:text-5xl">
              {article.title}
            </h1>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted">
              {article.author} · {article.publishedAt} · {article.readTime} min
            </p>
          </div>
        </section>

        <div className="relative z-0 mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-lg leading-relaxed text-muted-light sm:text-xl">{article.excerpt}</p>
          <div className="prose-archive mt-10 sm:mt-12">
            {paragraphs.map((block, i) => {
              if (block.startsWith("## ")) {
                return (
                  <h2 key={`h-${i}-${block.slice(0, 24)}`}>{block.replace("## ", "")}</h2>
                );
              }
              if (block.startsWith("- ")) {
                const items = block.split("\n").filter((l) => l.startsWith("- "));
                return (
                  <ul key={`ul-${i}`} className="my-4 space-y-2">
                    {items.map((item, j) => (
                      <li key={`li-${i}-${j}`} className="text-muted-light">
                        — {item.replace("- ", "")}
                      </li>
                    ))}
                  </ul>
                );
              }
              return <p key={`p-${i}`}>{block}</p>;
            })}
          </div>
        </div>
      </article>
    </>
  );
}
