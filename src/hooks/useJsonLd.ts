import { useEffect } from "react";

export function useJsonLd(id: string, data: unknown) {
  useEffect(() => {
    document.getElementById(id)?.remove();
    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [data, id]);
}
