// Simple Node script to query Convex directly
const { ConvexHttpClient } = require("convex/browser");

const client = new ConvexHttpClient("https://modest-ram-699.convex.cloud");

async function checkAlbums() {
  try {
    // Query for Claire (second kid based on the ID from logs)
    const claireKidId = "jh7arscbq4bznbq9ex0xeesrmn7vk3q5";

    console.log("Checking albums for Claire (kid ID:", claireKidId, ")");

    // We can't query directly without an exported function, but we can check via the API
    console.log("\nPlease check the Convex dashboard at:");
    console.log("https://dashboard.convex.dev/t/family-planner-6959/modest-ram-699/data/approvedAlbums");
    console.log("\nFilter by kidProfileId:", claireKidId);
    console.log("\nLook for albums with appleAlbumId: 270003831 (The Beautiful Letdown)");
  } catch (error) {
    console.error("Error:", error);
  }
}

checkAlbums();
