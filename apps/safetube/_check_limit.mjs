import { ConvexHttpClient } from "convex/browser";
const c = new ConvexHttpClient("https://rightful-rabbit-333.convex.cloud");
const kid = "jh72r3e1wndvwzgmg0qtn60xan7xhxkw";
const out = {};
out.timeLimit = await c.query("timeLimits:getTimeLimit", { kidProfileId: kid });
out.canWatch = await c.query("timeLimits:canWatch", { kidProfileId: kid });
console.log(JSON.stringify(out, null, 2));
