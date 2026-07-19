export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Visible FAQ block that mirrors the FAQPage JSON-LD emitted alongside it.
 * Answers must be plain text derived from verified catalog data — never fabricated.
 */
export function FaqSection({
  items,
  title = "Frequently asked questions",
}: {
  items: FaqItem[];
  title?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-12 border-t border-border pt-10">
      <h2 className="font-serif text-2xl text-foreground">{title}</h2>
      <dl className="mt-6 space-y-6">
        {items.map((item) => (
          <div key={item.question}>
            <dt className="font-medium text-foreground">{item.question}</dt>
            <dd className="mt-2 text-sm text-muted-light">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
