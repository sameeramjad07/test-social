// import fs from "fs";
// import fetch from "node-fetch";
// import { GoogleGenAI, Modality } from "@google/genai";

// // Helper function to format commission data for display
// function formatCommissionDisplay(commissions) {
//     if (!commissions || commissions.length === 0) return null;

//     const displays = [];

//     for (const commission of commissions) {
//         if (commission.type === 'percentage') {
//             displays.push(${commission.max}% Cashback);
//         } else if (commission.type === 'fixed') {
//             displays.push(€${commission.max} Reward);
//         }
//     }

//     return displays.join(' + ');
// }

// // Helper function to get the best commission highlight
// function getBestCommissionHighlight(commissions) {
//     if (!commissions || commissions.length === 0) return null;

//     // Prioritize percentage over fixed
//     const percentage = commissions.find(c => c.type === 'percentage');
//     const fixed = commissions.find(c => c.type === 'fixed');

//     if (percentage && fixed) {
//         return ${percentage.max}% + €${fixed.max};
//     } else if (percentage) {
//         return ${percentage.max}% BACK;
//     } else if (fixed) {
//         return €${fixed.max} BONUS;
//     }

//     return null;
// }

// // Google Nano Banana (Gemini 2.5 Flash Image) API Implementation
// async function generateWithNanoBanana(workspace, store, schedule, commissions = []) {
//     try {
//         const ai = new GoogleGenAI({ apiKey: "AIzaSyAgBNcr9B_5ptU8bGhP_GpdN9KS1tBc41U" });

//         // Get commission highlights
//         const commissionHighlight = getBestCommissionHighlight(commissions);
//         const commissionText = commissionHighlight ? • "${commissionHighlight}" in bold, eye-catching style : '';

//         const effectivePrompt = schedule.imagePrompt ||
//             `Create a CLEAN, MINIMAL promotional banner with VERY LIMITED TEXT.

//                 STRICT Design Rules:
//                 - MAXIMUM 3-4 text elements only
//                 - NO paragraphs, NO descriptions, NO body text
//                 - Focus on visual impact, not text content

//                 Essential Elements (text minimal):
//                 1. Store name: "${store.name}" (prominent)
//                 2. Commission offer: "${commissionHighlight || 'SPECIAL OFFER'}" (very bold)
//                 3. Call-to-action: "SHOP NOW" or similar (1-2 words max)

//                 Visual Requirements:
//                 - Logos: Include Promowaves and ${store.name} logos
//                 - Style: Clean, modern, high-impact design
//                 - Colors: Bold, contrasting, attention-grabbing
//                 - Category: ${store.category} theme (visual elements, not text)
//                 - Layout: Spacious, uncluttered, professional
//                 - Background: Simple gradient or pattern

//                 Format: Social media banner, mobile-optimized`;

//         // Prepare content array with logos if they exist
//         const promptContent = [];

//         // Add text prompt
//         promptContent.push({ text: effectivePrompt });

//         // Add workspace logo if available
//         if (workspace.logoUrl) {
//             let logoBase64;
//             if (workspace.logoUrl.startsWith('http')) {
//                 const response = await fetch(workspace.logoUrl);
//                 const buffer = await response.buffer();
//                 logoBase64 = buffer.toString('base64');
//             } else {
//                 logoBase64 = fs.readFileSync(workspace.logoUrl).toString('base64');
//             }

//             promptContent.push({
//                 inlineData: {
//                     mimeType: "image/png",
//                     data: logoBase64,
//                 },
//             });
//         }

//         // Add store logo if available
//         if (store.logo) {
//             let storeLogoBase64;
//             if (store.logo.startsWith('http')) {
//                 const response = await fetch(store.logo);
//                 const buffer = await response.buffer();
//                 storeLogoBase64 = buffer.toString('base64');
//             } else {
//                 storeLogoBase64 = fs.readFileSync(store.logo).toString('base64');
//             }

//             promptContent.push({
//                 inlineData: {
//                     mimeType: "image/png",
//                     data: storeLogoBase64,
//                 },
//             });
//         }

//         const start = Date.now();

//         // Generate image using Nano Banana
//         const response = await ai.models.generateContent({
//             model: "gemini-2.5-flash-image-preview",
//             contents: promptContent,
//         });

//         const duration = Date.now() - start;

//         // Extract generated image from response
//         for (const part of response.candidates[0].content.parts) {
//             if (part.inlineData) {
//                 const imageBase64 = part.inlineData.data;
//                 const filename = promo-${store.name}-${Date.now()}.png;

//                 // Save the image
//                 const buffer = Buffer.from(imageBase64, "base64");
//                 fs.writeFileSync(filename, buffer);

//                 console.log(✅ Promotional image generated in ${duration}ms);
//                 console.log(📁 Image saved as ${filename});
//                 console.log(💰 Commission highlight: ${commissionHighlight || 'No commission data'});

//                 return {
//                     base64: imageBase64,
//                     filename: filename,
//                     duration: duration,
//                     model: "gemini-2.5-flash-image-preview",
//                     commission: commissionHighlight,
//                     metadata: {
//                         store: store.name,
//                         category: store.category,
//                         commissions: commissions
//                     }
//                 };
//             }
//         }

//         throw new Error("No image generated in response");

//     } catch (error) {
//         console.error("❌ Error with Nano Banana API:", error);
//         throw error;
//     }
// }

// // Main execution function
// async function main() {
//     const mockData = {
//         workspace: {
//             logoUrl: "https://promowaves.net/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo_close_beta.4fedd7a9.png&w=384&q=75"
//         },
//         store: {
//             name: "Sissy-Boy.be",
//             logo: "https://cdn.tradetracker.net/be/campaign_image_square/33000.png",
//             category: "Mode en sieraden",
//             // Simplified description - though it won't be used in the banner
//             description: "Fashion & Lifestyle Store"
//         },
//         schedule: {
//             imagePrompt: null, // Will use default prompt
//             platform: 'instagram' // or 'facebook', 'twitter', etc.
//         },
//         commissions: [
//             {
//                 "id": "cmfl957n10hmqcfhu8ihhzq40",
//                 "storeId": "27666-TRADETRACKER",
//                 "min": 35,
//                 "max": 35,
//                 "type": "fixed",
//                 "createdAt": "2025-09-15T15:01:31.553Z",
//                 "updatedAt": "2025-09-15T15:01:31.553Z"
//             },
//             {
//                 "id": "cmfl957n10hmrcfhuw2dgdclq",
//                 "storeId": "27666-TRADETRACKER",
//                 "min": 1,
//                 "max": 1,
//                 "type": "percentage",
//                 "createdAt": "2025-09-15T15:01:31.553Z",
//                 "updatedAt": "2025-09-15T15:01:31.553Z"
//             }
//         ]
//     };

//     try {
//         console.log("🎨 Generating promotional graphic with commission data...");
//         console.log(📊 Commission Details:);
//         mockData.commissions.forEach(c => {
//             console.log(`   - ${c.type === 'percentage' ? ${c.max}% cashback : €${c.max} fixed reward}`);
//         });

//         const result = await generateWithNanoBanana(
//             mockData.workspace,
//             mockData.store,
//             mockData.schedule,
//             mockData.commissions
//         );

//         console.log("\n✨ Generation successful!");
//         console.log("📋 Result details:", {
//             filename: result.filename,
//             duration: ${result.duration}ms,
//             commission: result.commission,
//             store: result.metadata.store
//         });

//     } catch (error) {
//         console.error("❌ Failed to generate promotional graphic:", error);
//     }
// }

// // Export functions for external use
// export {
//     generateWithNanoBanana,
//     formatCommissionDisplay,
//     getBestCommissionHighlight
// };

// // Run if executed directly
// if (import.meta.url === file://${process.argv[1]}) {
//     main();
// }

// /////////////////////////////////////////////

// generateImagesForAllPostsOfPromowaves: protectedProcedure
//     .input(z.object({ scheduleId: z.string(), workspaceId: z.string() }))
//     .mutation(async ({ ctx, input }) => {
//       const { scheduleId, workspaceId } = input;

//       // Authorization checks (unchanged)
//       if (!ctx.session.user.id) {
//         throw new TRPCError({
//           code: "UNAUTHORIZED",
//           message: "User session not found",
//         });
//       }
//       const member = await ctx.db.workspaceMember.findFirst({
//         where: {
//           workspaceId,
//           userId: ctx.session.user.id,
//         },
//         include: {
//           role: {
//             include: {
//               permissions: {
//                 include: { permission: true },
//               },
//             },
//           },
//         },
//       });
//       if (!member) {
//         throw new TRPCError({
//           code: "FORBIDDEN",
//           message: "Not a member of this workspace",
//         });
//       }
//       const hasPermission =
//         member.role.name === "owner" ||
//         member.role.permissions.some(
//           (rp) =>
//             rp.permission.resource === "posts" &&
//             rp.permission.action === "update"
//         );
//       if (!hasPermission) {
//         throw new TRPCError({
//           code: "FORBIDDEN",
//           message: "You don't have permission to update posts",
//         });
//       }

//       const schedule = await ctx.db.postSchedule.findUnique({
//         where: { id: scheduleId },
//         include: { posts: { include: { images: true } } },
//       });
//       if (!schedule || schedule.workspaceId !== workspaceId) {
//         throw new TRPCError({
//           code: "NOT_FOUND",
//           message: "Schedule not found",
//         });
//       }
//       if (schedule.isActive) {
//         throw new TRPCError({
//           code: "BAD_REQUEST",
//           message: "Cannot generate images for active schedule",
//         });
//       }

//       const posts = schedule.posts.filter(
//         (post) => post.status === PostStatus.CONTENT_APPROVED
//       );
//       if (posts.length === 0) {
//         throw new TRPCError({
//           code: "BAD_REQUEST",
//           message:
//             "No posts with approved content available for image generation",
//         });
//       }

//       const totalImages = posts.length;

//       await ctx.db.postGenerationProgress.upsert({
//         where: { scheduleId },
//         create: { scheduleId, total: totalImages, completed: 0 },
//         update: { total: totalImages, completed: 0 },
//       });

//       const workspace = await ctx.db.workspace.findUnique({
//         where: { id: workspaceId },
//         select: { logoUrl: true },
//       });
//       wo
//       if (!workspace || !workspace.logoUrl) {
//         throw new TRPCError({
//           code: "BAD_REQUEST",
//           message: "Workspace logo not found",
//         });
//       }

//       // Fetch list of stores once (cache per run)
//       let storeList: any[] = [];
//       try {
//         const storesResp = await axios.get(
//           "https://promowaves.net/api/getStores",
//           {
//             timeout: 10000,
//           }
//         );
//         storeList = Array.isArray(storesResp.data) ? storesResp.data : [];
//       } catch (err) {
//         console.warn("Could not fetch store list from Promowaves API:", err);
//         // we continue - individual store lookups will fail gracefully
//       }

//       let completed = 0;
//       for (const post of posts) {
//         try {
//           // Fetch the store details from UsedStore table
//           const usedStore = await ctx.db.usedStore.findFirst({
//             where: { workspaceId, scheduleId, storeName: post.storeName || "" },
//           });

//           if (!usedStore) {
//             console.error(`No store found for post ${post.id}`);
//             continue;
//           }

//           // Find store in Promowaves API response using name OR displayUrl fallback
//           const store =
//             storeList.find(
//               (s: any) =>
//                 (s.name &&
//                   s.name.toLowerCase() ===
//                     (post.storeName || "").toLowerCase()) ||
//                 (s.displayUrl && s.displayUrl === post.storeName)
//             ) || null;

//           if (!store) {
//             console.error(`Store not found for ${post.storeName}`);
//             continue;
//           }

//           // Commission highlight text
//           const commissionHighlight = getBestCommissionHighlight(
//             store.commissionRanges || []
//           );
//           const commissionText = commissionHighlight
//             ? `• "${commissionHighlight}" in bold, eye-catching style`
//             : "";

//           // Construct the image prompt (keep minimal). Also add a short directive to use displayUrl as a small watermark/footer.
//           const effectivePrompt =
//             schedule.imagePrompt ||
//             `Create a CLEAN, MINIMAL promotional banner with VERY LIMITED TEXT.

// STRICT Design Rules:
// - MAXIMUM 3-4 text elements only
// - NO paragraphs, NO descriptions, NO body text
// - Focus on visual impact, not text content

// Essential Elements (text minimal):
// 1. Store name: "${store.name}" (prominent)
// 2. Commission offer: "${commissionHighlight || "SPECIAL OFFER"}" (very bold)
// 3. Call-to-action: "SHOP NOW" or similar (1-2 words max)

// Visual Requirements:
// - Logos: Include Promowaves and ${
//               store.name
//             } logos (use Promowaves logo as a brand mark)
// - Add store website/displayUrl as a small watermark/footer: "${
//               store.displayUrl || ""
//             }" (tiny, bottom-right)
// - Style: Clean, modern, high-impact design
// - Colors: Bold, contrasting, attention-grabbing
// - Category: ${store.category || "general"} theme (visual elements, not text)
// - Layout: Spacious, uncluttered, professional
// - Background: Simple gradient or pattern

// Format: Social media banner, mobile-optimized`;

//           // Build prompt parts (text + inline logos). We intentionally push the main text prompt first,
//           // then inline promowaves logo, then store logo, then a small text part for the displayUrl watermark.
//           const promptContent: any[] = [{ text: effectivePrompt }];

//           // Add Promowaves (workspace) logo as inline image
//           if (workspace.logoUrl) {
//             try {
//               const logoResp = await fetch(workspace.logoUrl);
//               const logoArrayBuffer = await logoResp.arrayBuffer();
//               const logoBase64 =
//                 Buffer.from(logoArrayBuffer).toString("base64");
//               promptContent.push({
//                 inlineData: {
//                   mimeType:
//                     // @ts-ignore headers may be present
//                     (logoResp.headers && logoResp.headers.get
//                       ? logoResp.headers.get("content-type")
//                       : undefined) || "image/png",
//                   data: logoBase64,
//                 },
//               });
//             } catch (logoError) {
//               console.warn(
//                 "Failed to fetch Promowaves workspace logo:",
//                 logoError
//               );
//             }
//           }

//           // Add store logo as inline image (if present)
//           if (store.logo) {
//             try {
//               const storeLogoResp = await fetch(store.logo);
//               const storeLogoBuffer = await storeLogoResp.arrayBuffer();
//               const storeLogoBase64 =
//                 Buffer.from(storeLogoBuffer).toString("base64");
//               promptContent.push({
//                 inlineData: {
//                   mimeType:
//                     (storeLogoResp.headers && storeLogoResp.headers.get
//                       ? storeLogoResp.headers.get("content-type")
//                       : undefined) || "image/png",
//                   data: storeLogoBase64,
//                 },
//               });
//             } catch (storeLogoError) {
//               console.warn(
//                 `Failed to fetch ${store.name} logo:`,
//                 storeLogoError
//               );
//             }
//           }

//           // Small explicit text instruction to use store.displayUrl as watermark/footer (helps the model place it)
//           if (store.displayUrl) {
//             promptContent.push({
//               text: `Small watermark/footer: ${store.displayUrl} (tiny, bottom-right)`,
//             });
//           }

//           // Also pass the commission text as a short explicit instruction if available
//           if (commissionText) {
//             promptContent.push({ text: commissionText });
//           }

//           // Call the image model
//           const start = Date.now();
//           const genResponse = await genAI.models.generateContent({
//             model: "gemini-2.5-flash-image-preview",
//             contents: promptContent,
//           });

//           const duration = (Date.now() - start) / 1000;

//           // Extract base64 image
//           let imageBase64: string | null = null;
//           if (genResponse.candidates?.length) {
//             for (const part of genResponse.candidates[0]?.content?.parts ||
//               []) {
//               if (part.inlineData?.data) {
//                 imageBase64 = part.inlineData.data;
//                 break;
//               }
//             }
//           }

//           if (!imageBase64) {
//             throw new Error("No image generated in response");
//           }

//           // Upload the generated image (assumes helper exists in your codebase)
//           const uploadUrl = await uploadGeneratedImageFromBase64(imageBase64);

//           // Log AI generation
//           const aiGeneration = await ctx.db.aIGenerationLog.create({
//             data: {
//               userId: ctx.session.user.id,
//               workspaceId,
//               postId: post.id,
//               scheduleId,
//               type: "IMAGE",
//               prompt: effectivePrompt,
//               model: "gemini-2.5-flash-image-preview",
//               imageSize: "1200x630",
//               duration,
//               status: "COMPLETED",
//               cost: 0,
//             },
//           });

//           // Attach / update post image entry
//           let postImage;
//           if (post.images.length > 0 && post.images[0]?.id) {
//             postImage = await ctx.db.postImage.update({
//               where: { id: post.images[0].id },
//               data: {
//                 url: uploadUrl,
//                 aiPrompt: effectivePrompt,
//                 isApproved: false,
//                 aiGenerationId: aiGeneration.id,
//               },
//             });
//           } else {
//             postImage = await ctx.db.postImage.create({
//               data: {
//                 postId: post.id,
//                 url: uploadUrl,
//                 aiPrompt: effectivePrompt,
//                 isApproved: false,
//                 order: 0,
//                 aiGenerationId: aiGeneration.id,
//               },
//             });
//           }

//           // Update the AI generation log with the imageId
//           await ctx.db.aIGenerationLog.update({
//             where: { id: aiGeneration.id },
//             data: {
//               imageId: postImage.id,
//               status: "COMPLETED",
//             },
//           });

//           completed++;
//           await ctx.db.postGenerationProgress.update({
//             where: { scheduleId },
//             data: { completed },
//           });

//           console.log(
//             `✅ Generated image for "${store.name}" (${
//               store.displayUrl || "no displayUrl"
//             }) — ${duration}s — commission: ${commissionHighlight || "none"}`
//           );
//         } catch (error) {
//           console.error(`Failed to generate image for post ${post.id}:`, error);

//           // Log failed generation
//           await ctx.db.aIGenerationLog.create({
//             data: {
//               userId: ctx.session.user.id,
//               workspaceId,
//               postId: post.id,
//               scheduleId,
//               type: "IMAGE",
//               prompt: schedule.imagePrompt || "Default prompt",
//               model: "gemini-2.5-flash-image-preview",
//               imageSize: "1200x630",
//               duration: 0,
//               status: "FAILED",
//               error: error instanceof Error ? error.message : "Unknown error",
//               cost: 0,
//             },
//           });

//           // continue with next
//           continue;
//         }
//       } // end for posts

//       return { success: true, imagesGenerated: completed };
//     }),
