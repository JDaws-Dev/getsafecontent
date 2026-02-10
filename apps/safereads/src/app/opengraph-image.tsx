import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "SafeReads — AI-powered book content reviews for parents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fdf8f0",
          fontFamily: "serif",
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            backgroundColor: "#a6602c",
          }}
        />

        {/* Book icon */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#a6602c"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          <path d="M8 7h6" />
          <path d="M8 11h4" />
        </svg>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#1a1a1a",
            marginTop: 24,
            letterSpacing: "-0.02em",
          }}
        >
          SafeReads
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "#6b5c4d",
            marginTop: 12,
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          Know what&apos;s in the book before your kid reads it
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 20,
            color: "#a6602c",
            marginTop: 16,
          }}
        >
          AI-powered content reviews for parents
        </div>
      </div>
    ),
    { ...size }
  );
}
