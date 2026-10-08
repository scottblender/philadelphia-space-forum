import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const isAccountSite = repositoryName.endsWith(".github.io");
const repositoryBasePath = repositoryName && !isAccountSite
  ? `/${repositoryName}`
  : "";
// configure-pages supplies an empty base path for custom domains and account
// sites. Preserve that empty value instead of falling back to the repo name.
const basePath = isGitHubPages
  ? (process.env.PAGES_BASE_PATH ?? repositoryBasePath).replace(/\/$/, "")
  : "";

const nextConfig: NextConfig = {
  ...(isGitHubPages ? {
    output: "export",
    trailingSlash: true,
    basePath,
    assetPrefix: basePath,
    images: { unoptimized: true },
  } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
