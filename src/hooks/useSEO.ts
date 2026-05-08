import { useEffect } from "react";

type SEOOptions = {
  title: string;
  description: string;
  canonicalPath?: string;
  keywords?: string;
  noindex?: boolean;
  imagePath?: string;
  type?: "website" | "article" | "product";
};

export function useSEO({
  title,
  description,
  canonicalPath,
  keywords,
  noindex,
  imagePath = "/og-coinin.svg",
  type = "website",
}: SEOOptions) {
  useEffect(() => {
    const canonicalUrl = canonicalPath
      ? `${window.location.origin}${canonicalPath}`
      : window.location.href;
    const imageUrl = imagePath.startsWith("http")
      ? imagePath
      : `${window.location.origin}${imagePath}`;

    document.title = title;
    setMeta("description", description);
    if (keywords) setMeta("keywords", keywords);
    setOrCreateMeta("robots", noindex ? "noindex, nofollow" : "index, follow");
    setOrCreateMeta("theme-color", "#0f1028");
    setOrCreateMeta("twitter:card", "summary_large_image");
    setProperty("og:title", title);
    setProperty("og:description", description);
    setProperty("og:type", type);
    setProperty("og:image", imageUrl);
    setProperty("og:locale", "id_ID");
    setProperty("og:site_name", "CoinIn");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", imageUrl);

    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) {
      canonical.href = canonicalUrl;
    }
    setProperty("og:url", canonical?.href ?? canonicalUrl);
  }, [canonicalPath, description, imagePath, keywords, noindex, title, type]);
}

function setMeta(name: string, content: string) {
  const element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (element) {
    element.content = content;
    return;
  }
  const created = document.createElement("meta");
  created.name = name;
  created.content = content;
  document.head.appendChild(created);
}

function setProperty(property: string, content: string) {
  const element = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (element) {
    element.content = content;
    return;
  }
  const created = document.createElement("meta");
  created.setAttribute("property", property);
  created.content = content;
  document.head.appendChild(created);
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
