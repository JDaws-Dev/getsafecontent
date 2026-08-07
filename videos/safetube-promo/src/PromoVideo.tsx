import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

// SafeTube brand colors (YouTube-inspired red/orange)
const COLORS = {
  red: "#ef4444",
  orange: "#f97316",
  dark: "#1a1a2e",
  light: "#f8fafc",
};

interface PromoVideoProps {
  title: string;
}

export const PromoVideo: React.FC<PromoVideoProps> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Animation timing
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const taglineOpacity = interpolate(
    frame,
    [30, 60],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  const featureSlide = interpolate(
    frame,
    [90, 120],
    [100, 0],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.dark} 0%, #2d1520 100%)`,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Logo Section */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "50%",
          transform: `translateX(-50%) scale(${logoScale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Shield with Play Icon */}
        <div
          style={{
            width: 120,
            height: 130,
            background: `linear-gradient(135deg, ${COLORS.red}, ${COLORS.orange})`,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          {/* Play triangle */}
          <svg width={60} height={60} viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.light,
            margin: 0,
            letterSpacing: "-2px",
          }}
        >
          {title}
        </h1>
      </div>

      {/* Tagline */}
      <div
        style={{
          position: "absolute",
          top: "45%",
          left: "50%",
          transform: "translateX(-50%)",
          opacity: taglineOpacity,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 36,
            color: COLORS.light,
            opacity: 0.9,
            margin: 0,
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Safe YouTube for kids.
          <br />
          <span style={{ color: COLORS.orange }}>You control what they watch.</span>
        </p>
      </div>

      {/* Features List */}
      <div
        style={{
          position: "absolute",
          top: "60%",
          left: "50%",
          transform: `translateX(-50%) translateY(${featureSlide}px)`,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {[
          "Only approved videos play",
          "Block entire channels",
          "No ads or recommendations",
          "See their watch history",
        ].map((feature, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              opacity: interpolate(
                frame,
                [120 + i * 15, 150 + i * 15],
                [0, 1],
                { extrapolateRight: "clamp" }
              ),
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${COLORS.red}, ${COLORS.orange})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "white", fontSize: 18 }}>✓</span>
            </div>
            <span style={{ fontSize: 28, color: COLORS.light }}>{feature}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          opacity: interpolate(
            frame,
            [durationInFrames - 90, durationInFrames - 60],
            [0, 1],
            { extrapolateRight: "clamp" }
          ),
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, ${COLORS.red}, ${COLORS.orange})`,
            padding: "20px 48px",
            borderRadius: 50,
            fontSize: 32,
            fontWeight: 600,
            color: "white",
          }}
        >
          Try 7 Days Free
        </div>
        <p
          style={{
            textAlign: "center",
            color: COLORS.light,
            opacity: 0.7,
            marginTop: 16,
            fontSize: 20,
          }}
        >
          getsafetube.com
        </p>
      </div>
    </AbsoluteFill>
  );
};
