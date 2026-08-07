import { Composition } from "remotion";
import { PromoVideo } from "./PromoVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Main promo video - 30 seconds at 30fps */}
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: "SafeTube",
        }}
      />

      {/* Short version for social - 15 seconds */}
      <Composition
        id="PromoShort"
        component={PromoVideo}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: "SafeTube",
        }}
      />

      {/* Landscape version for YouTube - 16:9 */}
      <Composition
        id="PromoLandscape"
        component={PromoVideo}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "SafeTube",
        }}
      />
    </>
  );
};
