// Search index: one JSON blob the client filters in memory. Fetched once, on
// first focus of the search input. See src/js/search.js.
export default class {
  data() {
    return {
      permalink: "/search-index.json",
      eleventyExcludeFromCollections: true,
    };
  }

  // Class method, not an arrow — universal filters live on `this`.
  render({ collections }) {
    const terms = new Set();
    const docs = collections.brief.map((b) => {
      const title = b.data.title;
      const topics = b.data.topics || [];
      // Pre-lowercased and tag-stripped: this text is only ever matched
      // against, never displayed. ponytail: .toLowerCase() is the only
      // normalization — the corpus has no accents and no curly quotes.
      const text = String(b.templateContent).replace(/<[^>]+>/g, " ").toLowerCase();
      for (const w of `${text} ${title} ${topics.join(" ")}`.toLowerCase().split(/[^a-z0-9]+/)) {
        if (w.length > 2) terms.add(w);
      }
      return {
        title,
        url: b.url,
        week: this.isoWeek(b.date),
        date: this.isoDate(b.date),
        topics,
        text,
      };
    });
    // terms feeds typo correction only — never matched against the corpus.
    return JSON.stringify({ docs, terms: [...terms] });
  }
}
