import { TRPCError } from "@trpc/server";
import axios from "axios";

export interface Store {
  name: string;
  description: string;
  logo: string;
  category: string;
  keywords: string[];
  displayUrl: string;
}

interface UsedStore {
  storeName: string;
}

export async function fetchAndSelectStore(
  ctx: any,
  workspaceId: string,
  scheduleId: string
): Promise<Store> {
  try {
    // Fetch stores from the API
    const response = await axios.get("https://promowaves.net/api/getStores");
    const stores: Store[] = response.data;

    if (!stores || stores.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No stores available from the API",
      });
    }

    // Get used stores for this workspace and schedule
    const usedStores: UsedStore[] = await ctx.db.usedStore.findMany({
      where: {
        workspaceId,
        scheduleId,
      },
      select: { storeName: true },
    });

    const usedStoreNames = new Set(
      usedStores.map((store: UsedStore) => store.storeName)
    );

    // Filter out used stores
    let availableStores = stores.filter(
      (store: Store) => !usedStoreNames.has(store.name)
    );

    if (availableStores.length === 0) {
      // Reset used stores if all have been used
      await ctx.db.usedStore.deleteMany({
        where: { workspaceId, scheduleId },
      });
      availableStores = [...stores];
    }

    if (availableStores.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No stores available after reset",
      });
    }

    // Select a random store
    const randomStore =
      availableStores[Math.floor(Math.random() * availableStores.length)];

    if (!randomStore) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Random store selection failed",
      });
    }

    // Log the used store
    await ctx.db.usedStore.create({
      data: {
        workspaceId,
        scheduleId,
        storeName: randomStore.name,
        storeUrl: randomStore.displayUrl,
      },
    });

    return randomStore;
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch or select store",
      cause: error,
    });
  }
}
