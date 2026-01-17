/*
  Warnings:

  - Added the required column `hash` to the `Upload` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Upload" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uploaderId" INTEGER,
    "originalName" TEXT NOT NULL,
    "storageName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Upload" ("createdAt", "id", "mimeType", "originalName", "size", "storageName", "uploaderId") SELECT "createdAt", "id", "mimeType", "originalName", "size", "storageName", "uploaderId" FROM "Upload";
DROP TABLE "Upload";
ALTER TABLE "new_Upload" RENAME TO "Upload";
CREATE UNIQUE INDEX "Upload_storageName_key" ON "Upload"("storageName");
CREATE UNIQUE INDEX "Upload_hash_key" ON "Upload"("hash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
