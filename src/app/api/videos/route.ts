import { NextRequest, NextResponse } from "next/server";

const IRYS_GRAPHQL_ENDPOINT = "https://uploader.irys.xyz/graphql";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorAddress = searchParams.get("creator");
    const category = searchParams.get("category");
    const accessType = searchParams.get("accessType");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build GraphQL query
    const tagFilters = [
      `{ name: "App-Name", values: ["DecentralizedVideo"] }`,
      `{ name: "Type", values: ["video-metadata"] }`,
    ];

    if (creatorAddress) {
      tagFilters.push(`{ name: "Creator", values: ["${creatorAddress}"] }`);
    }
    if (category) {
      tagFilters.push(`{ name: "Category", values: ["${category}"] }`);
    }
    if (accessType) {
      tagFilters.push(`{ name: "AccessType", values: ["${accessType}"] }`);
    }

    const query = `
      query {
        transactions(
          tags: [${tagFilters.join(", ")}]
          first: ${limit}
          order: DESC
        ) {
          edges {
            node {
              id
              tags {
                name
                value
              }
              timestamp
            }
          }
        }
      }
    `;

    const response = await fetch(IRYS_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error("Failed to query Irys");
    }

    const json = await response.json();
    const edges = json.data?.transactions?.edges || [];

    // Fetch full metadata for each video
    const videos = await Promise.all(
      edges.map(async (edge: any) => {
        try {
          const metadataResponse = await fetch(
            `https://gateway.irys.xyz/${edge.node.id}`
          );
          if (!metadataResponse.ok) return null;

          const metadata = await metadataResponse.json();
          return {
            id: edge.node.id,
            ...metadata,
          };
        } catch {
          return null;
        }
      })
    );

    // Filter out null values
    const validVideos = videos.filter(Boolean);

    return NextResponse.json({
      videos: validVideos,
      total: validVideos.length,
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
