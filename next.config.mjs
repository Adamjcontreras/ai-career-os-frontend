/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdfjs-dist references the Node-only "canvas" package; we only use text
    // extraction in the browser, so stub it out to keep the build clean.
    config.resolve = config.resolve || {};
    config.resolve.alias = { ...(config.resolve.alias || {}), canvas: false };
    return config;
  },
};
export default nextConfig;
