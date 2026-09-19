-- CreateTable
CREATE TABLE "Screen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "consoleType" TEXT NOT NULL DEFAULT 'PS5',
    "pricingRuleId" TEXT NOT NULL,
    "active" INTEGER NOT NULL DEFAULT 1,
    "maintenance" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Screen_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "PricingRule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "billingMethod" TEXT NOT NULL,
    "hourlyRateFils" INTEGER NOT NULL CHECK ("hourlyRateFils" >= 0),
    "blocksJson" TEXT NOT NULL DEFAULT '[]',
    "active" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "priceFils" INTEGER NOT NULL CHECK ("priceFils" >= 0),
    "active" INTEGER NOT NULL DEFAULT 1,
    "stockQuantity" INTEGER CHECK ("stockQuantity" IS NULL OR "stockQuantity" >= 0),
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "screenId" TEXT NOT NULL,
    "pricingRuleId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "billingMode" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "plannedDurationSeconds" INTEGER CHECK ("plannedDurationSeconds" IS NULL OR "plannedDurationSeconds" > 0),
    "pausedDurationSeconds" INTEGER NOT NULL DEFAULT 0,
    "actualDurationSeconds" INTEGER,
    "pricingRuleName" TEXT NOT NULL,
    "billingMethod" TEXT NOT NULL,
    "hourlyRateFils" INTEGER NOT NULL CHECK ("hourlyRateFils" >= 0),
    "blocksJson" TEXT NOT NULL DEFAULT '[]',
    "gamingCostFils" INTEGER NOT NULL DEFAULT 0 CHECK ("gamingCostFils" >= 0),
    "extrasCostFils" INTEGER NOT NULL DEFAULT 0 CHECK ("extrasCostFils" >= 0),
    "discountFils" INTEGER NOT NULL DEFAULT 0 CHECK ("discountFils" >= 0),
    "totalFils" INTEGER NOT NULL DEFAULT 0 CHECK ("totalFils" >= 0),
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "closedAt" DATETIME,
    CONSTRAINT "Session_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "Screen" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Session_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "PricingRule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "SessionPause" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "pausedAt" DATETIME NOT NULL,
    "resumedAt" DATETIME,
    CONSTRAINT "SessionPause_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SessionExtra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "productId" TEXT,
    "productNameSnapshot" TEXT NOT NULL,
    "unitPriceFils" INTEGER NOT NULL CHECK ("unitPriceFils" >= 0),
    "quantity" INTEGER NOT NULL CHECK ("quantity" >= 1),
    "totalFils" INTEGER NOT NULL CHECK ("totalFils" >= 0),
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionExtra_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionExtra_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "amountFils" INTEGER NOT NULL CHECK ("amountFils" >= 0),
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "changeFils" INTEGER NOT NULL DEFAULT 0 CHECK ("changeFils" >= 0),
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

CREATE TABLE "PaymentMethodConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT,
    "type" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PaymentMethodConfig_code_key" ON "PaymentMethodConfig"("code");
CREATE UNIQUE INDEX "Payment_sessionId_key" ON "Payment"("sessionId");
CREATE UNIQUE INDEX "Session_one_open_per_screen"
ON "Session"("screenId")
WHERE "status" IN ('RUNNING', 'PAUSED', 'CHECKOUT');
CREATE INDEX "Session_screenId_status_idx" ON "Session"("screenId", "status");
CREATE INDEX "Session_createdAt_idx" ON "Session"("createdAt");
CREATE INDEX "Session_closedAt_idx" ON "Session"("closedAt");
