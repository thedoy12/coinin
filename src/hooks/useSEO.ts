import { useEffect } from "react";

type SEOOptions = {
  title: string;
  description: string;
  canonicalPath?: string;
  keywords?: string;
  noindex?: boolean;
};

export function useSEO({
  title,
  description,
  canonicalPath,
  keywords,
  noindex,
}: SEOOptions) {
  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    if (keywords) setMeta("keywords", keywords);
    setOrCreateMeta("robots", noindex ? "noindex,nofollow" : "index,follow");
    setProperty("og:title", title);
    setProperty("og:description", description);
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);

    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) {
      canonical.href = canonicalPath
        ? `${window.location.origin}${canonicalPath}`
        : window.location.href;
    }
    setProperty("og:url", canonical?.href ?? window.location.href);
  }, [canonicalPath, description, keywords, noindex, title]);
}

function setMeta(name: string, content: string) {
  const element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (element) element.content = content;
}

function setProperty(property: string, content: string) {
  const element = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (element) element.content = content;
}

function setOrCreateMeta(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}
