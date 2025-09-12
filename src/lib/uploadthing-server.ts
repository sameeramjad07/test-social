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

export async function uploadGeneratedImageFromBase64(base64Data: string): Promise<string> {
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64');

  // Create a unique filename
  const uniqueName = `generated-${Date.now()}-${randomUUID()}.png`;

  let uploaded;
  try {
    // Create a Blob with the required name property for FileEsque type
    const blob = new Blob([buffer], { type: "image/png" }) as Blob & {
      name: string;
      lastModified?: number;
    };
    blob.name = uniqueName;

    // Upload directly to UploadThing
    uploaded = await utapi.uploadFiles([blob]);
  } catch (e) {
    throw new Error(`Failed to upload image to UploadThing: ${e}`);
  }

  const file = uploaded[0];

  if (!file || file.error || !file.data?.url) {
    throw new Error("UploadThing did not return a valid file URL");
  }

  return file.data.url;
}