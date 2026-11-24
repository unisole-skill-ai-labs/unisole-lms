export const getWebsiteUrl = (): string => {
  return (
    import.meta.env.VITE_WEBSITE_URL ||
    (typeof window !== "undefined"
      ? window.location.hostname.includes("stg")
        ? "https://stg.unisole.org"
        : window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
        ? "https://unisole.org"
        : "http://localhost:5180"
      : "http://localhost:5180")
  ).replace(/\/+$/, "");
};
