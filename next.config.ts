import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // PWA mati saat ngoding biar enteng
  register: true,
});

const nextConfig: NextConfig = {
  // Kalau sebelumnya ada pengaturan bawaan Next.js, taruh di dalam sini.
  // Kalau kosong, biarkan saja seperti ini.
};

export default withPWA(nextConfig);