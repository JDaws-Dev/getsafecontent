/**
 * Shared copy and logic for "Check a kid's device" — used by the page on the
 * kid's device (/check/[token]) and the live result card on the dashboard, so
 * both always say the same thing.
 */

export type DeviceKind = "chromebook" | "android" | "ios" | "windows" | "mac" | "other";

export type CheckResults = {
  safeEmbed: "ok" | "failed" | null;
  directEmbed: "silent" | "talked" | null;
  manualOpen: "blocked" | "opened" | null;
  completed: boolean;
};

export const DEVICE_LABEL: Record<DeviceKind, string> = {
  chromebook: "Chromebook",
  android: "Android phone or tablet",
  ios: "iPhone or iPad",
  windows: "Windows computer",
  mac: "Mac",
  other: "this device",
};

/** Best-effort device detection from the browser. */
export function detectDeviceKind(ua: string, maxTouchPoints = 0): DeviceKind {
  if (/CrOS/i.test(ua)) return "chromebook";
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  // iPadOS reports itself as a Mac; a touch screen gives it away.
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return "ios";
  if (/Windows/i.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "mac";
  return "other";
}

export type Verdict = {
  tone: "good" | "bad" | "warn" | "pending";
  headline: string;
  detail: string;
};

/** Plain-English read of the results so far. */
export function verdict(r: CheckResults, kid = "your child"): Verdict {
  const reachable = r.directEmbed === "talked" || r.manualOpen === "opened";
  if (reachable) {
    return {
      tone: "bad",
      headline: "Regular YouTube works on this device",
      detail: `That means ${kid} can watch anything on YouTube here, outside SafeTube. The steps below close it off.`,
    };
  }
  if (r.safeEmbed === "failed") {
    return {
      tone: "warn",
      headline: "SafeTube's videos can't play on this device",
      detail: `The device is blocking the video player SafeTube uses, so ${kid} would only see videos that won't load. Approve the sites below and run the check again.`,
    };
  }
  if (!r.completed) {
    return { tone: "pending", headline: "Check in progress", detail: "Results appear here as each step finishes." };
  }
  return {
    tone: "good",
    headline: "Looks locked down",
    detail: "SafeTube's videos play, and regular YouTube is blocked. Nothing to change on this device.",
  };
}

export type Fix = { title: string; steps: string[]; note?: string };

/** What to change, by device, when regular YouTube is reachable or SafeTube is blocked. */
export function fixesFor(kind: DeviceKind, problem: "youtube" | "safetube"): Fix[] {
  const approved =
    "Approved sites should be getsafefamily.com and youtube-nocookie.com. Never approve youtube.com.";
  switch (kind) {
    case "chromebook":
    case "android":
      return problem === "safetube"
        ? [{
            title: "In the Family Link app on your phone",
            steps: [
              `Open Family Link, pick your child, then Controls > Content restrictions > Google Chrome.`,
              `Choose "Only allow approved sites" (or keep your current setting) and add getsafefamily.com and youtube-nocookie.com to Approved sites.`,
              "Run this check again on the device.",
            ],
            note: approved,
          }]
        : [
            {
              title: "In the Family Link app on your phone",
              steps: [
                `Open Family Link, pick your child, then Controls > Content restrictions > Google Chrome.`,
                `Choose "Only allow approved sites". ${approved}`,
                "Add youtube.com and m.youtube.com to Blocked sites as well.",
                "Under Google Play, block the YouTube and YouTube Kids apps (or remove them from the device).",
              ],
            },
            ...(kind === "chromebook"
              ? [{
                  title: "On the Chromebook, signed in as the owner",
                  steps: [
                    "Open Settings > Security and privacy > Manage other people.",
                    "Turn off \"Enable Guest browsing\". Guest mode skips every Family Link rule.",
                    "Also make sure only your child's supervised account can sign in there.",
                  ],
                }]
              : []),
          ];
    case "ios":
      return problem === "safetube"
        ? [{
            title: "In Screen Time on your child's iPhone or iPad",
            steps: [
              "Settings > Screen Time > Content & Privacy Restrictions > App Store, Media, Web & Games > Web Content.",
              "If it is set to Allowed Websites Only, add getsafefamily.com and youtube-nocookie.com.",
              "Run this check again on the device.",
            ],
          }]
        : [{
            title: "In Screen Time on your child's iPhone or iPad",
            steps: [
              "Settings > Screen Time > Content & Privacy Restrictions > App Store, Media, Web & Games > Web Content.",
              "Choose Allowed Websites Only. Remove YouTube if it is on the list, and add getsafefamily.com and youtube-nocookie.com.",
              "Delete the YouTube app, and under App Store purchases set Installing Apps to Don't Allow so it can't come back.",
            ],
          }];
    case "windows":
    case "mac":
      return [{
        title: `On a ${kind === "mac" ? "Mac" : "Windows computer"}`,
        steps: [
          "To be honest with you: browser-only filtering can't be fully enforced on a regular computer. Another browser, a private window or a different account can get around it.",
          kind === "mac"
            ? "The strongest option is a separate macOS account for your child with Screen Time on: Content & Privacy > Store / Web Content > Allowed Websites Only."
            : "The strongest option is a Microsoft Family child account with \"Filter inappropriate websites\" and \"Only use allowed websites\" turned on in Microsoft Edge, and other browsers blocked.",
          "Or keep YouTube-style video on a Chromebook, iPad or Android device you can lock down properly.",
        ],
      }];
    default:
      return [{
        title: "On this device",
        steps: [
          `Use the device's parental controls to allow only approved websites. ${approved}`,
          "Remove or block any YouTube app.",
        ],
      }];
  }
}
