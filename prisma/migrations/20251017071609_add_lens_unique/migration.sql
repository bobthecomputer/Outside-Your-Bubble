/*
  Warnings:

  - A unique constraint covering the columns `[itemId,lensType]` on the table `Lens` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Lens_itemId_lensType_key" ON "Lens"("itemId", "lensType");
