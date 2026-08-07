import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

// SafeTunes brand colors
const COLORS = {
  purple: "#9333ea",
  pink: "#ec4899",
  dark: "#1a1a2e",
  light: "#f8fafc",
};

interface PromoVideoProps {
  title: string;
}

export const PromoVideo: React.FC<PromoVideoProps> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

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
        background: `linear-gradient(135deg, ${COLORS.dark} 0%, #2d1b4e 100%)`,
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
        {/* Shield Icon */}
        <svg
          width={120}
          height={130}
          viewBox="0 0 88.994 96.651"
          style={{ marginBottom: 24 }}
        >
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={COLORS.purple} />
              <stop offset="100%" stopColor={COLORS.pink} />
            </linearGradient>
          </defs>
          <path
            fill="url(#logoGradient)"
            d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"
          />
        </svg>

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
          Kid-safe music streaming.
          <br />
          <span style={{ color: COLORS.pink }}>Parent approved.</span>
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
          "Only approved music plays",
          "AI-powered lyric review",
          "Hide inappropriate covers",
          "See what they search for",
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
                background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.pink})`,
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
            background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.pink})`,
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
          getsafetunes.com
        </p>
      </div>
    </AbsoluteFill>
  );
};
