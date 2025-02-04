import { eq } from "drizzle-orm";
import { graphs } from "@db/schema";
import { db } from "db";
import { Router } from "express";

const router = Router();

// Other routes remain unchanged...

// Add new route to update last accessed time
router.post("/:id/access", async (req, res) => {
  const graphId = parseInt(req.params.id);
  if (isNaN(graphId)) {
    return res.status(400).json({ error: "Invalid graph ID" });
  }

  try {
    const updatedGraph = await db
      .update(graphs)
      .set({ modifiedAt: new Date().toISOString() })
      .where(eq(graphs.id, graphId))
      .returning();

    if (!updatedGraph.length) {
      return res.status(404).json({ error: "Graph not found" });
    }

    res.json(updatedGraph[0]);
  } catch (error) {
    console.error("Error updating graph access time:", error);
    res.status(500).json({ error: "Failed to update graph access time" });
  }
});

export default router;
