import { UTApi } from "uploadthing/server";
import { randomUUID } from "crypto"; // built-in in Node.js

const utapi = new UTApi();

export async function uploadGeneratedImage(imageUrl: string): Promise<string> {
  // Download the generated image
  const response = await fetch(imageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  // Create a unique filename
  const uniqueName = `generated-${Date.now()}-${randomUUID()}.png`;

  // Upload directly to UploadThing
  const uploaded = await utapi.uploadFiles([
    new File([buffer], uniqueName, { type: "image/png" }),
  ]);

  const file = uploaded[0];

  if (!file || file.error || !file.data?.url) {
    throw new Error("UploadThing did not return a valid file URL");
  }

  return file.data.url; // ✅ unique file URL
}
