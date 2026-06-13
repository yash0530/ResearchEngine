"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Stage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STAGES } from "@/config/sectors";

const stageSchema = z.object({
  code: z.string().min(2).max(2),
  stage: z.enum(STAGES),
  rationale: z.string().trim().min(1).max(500),
});

/** Human stage override: updates the sector AND records who/why in StageHistory. */
export async function setSectorStageAction(input: {
  code: string;
  stage: string;
  rationale: string;
}) {
  const v = stageSchema.parse(input);
  await prisma.$transaction([
    prisma.sector.update({ where: { code: v.code }, data: { stage: v.stage as Stage } }),
    prisma.stageHistory.create({
      data: {
        sectorCode: v.code,
        stage: v.stage as Stage,
        ratedBy: "human",
        rationale: v.rationale,
      },
    }),
  ]);
  revalidatePath("/");
  revalidatePath(`/sectors/${v.code}`);
  revalidatePath("/rerate");
}
