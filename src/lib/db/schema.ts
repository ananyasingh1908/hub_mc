import {
  mysqlTable,
  varchar,
  text,
  boolean,
  datetime,
  int,
  decimal,
  json,
  mysqlEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";

export const userRoleEnumValues = ["SUPER_ADMIN", "EMPLOYEE", "CUSTOMER"] as const;
export const orderStatusEnumValues = ["PENDING", "PAID", "FULFILLED", "FAILED", "REFUNDED"] as const;
export const deliveryStatusEnumValues = ["PENDING", "PROCESSING", "DELIVERED", "FAILED", "AWAITING_SERVER"] as const;
export const paymentMethodEnumValues = ["CARD", "UPI", "NETBANKING", "WALLET"] as const;
export const ticketStatusEnumValues = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export const tournamentStatusEnumValues = ["UPCOMING", "LIVE", "COMPLETED"] as const;
export const tournamentTypeEnumValues = ["SOLO", "DUO", "SQUAD"] as const;
export const matchStatusEnumValues = ["SCHEDULED", "LIVE", "COMPLETED"] as const;

export const users = mysqlTable(
  "User",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    email: varchar("email", { length: 191 }).notNull(),
    name: varchar("name", { length: 191 }),
    image: varchar("image", { length: 500 }),
    microsoftAccountId: varchar("microsoftAccountId", { length: 191 }),
    passwordHash: varchar("passwordHash", { length: 255 }),
    role: mysqlEnum("role", userRoleEnumValues).notNull().default("CUSTOMER"),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex("User_email_key").on(table.email),
    microsoftAccountIdUnique: uniqueIndex("User_microsoftAccountId_key").on(table.microsoftAccountId),
  }),
);

export const customers = mysqlTable(
  "Customer",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userId: varchar("userId", { length: 191 }).notNull(),
    minecraftUsername: varchar("minecraftUsername", { length: 191 }).notNull(),
    minecraftUuid: varchar("minecraftUuid", { length: 191 }).notNull(),
    avatarUrl: varchar("avatarUrl", { length: 500 }),
    skinUrl: varchar("skinUrl", { length: 500 }),
    lastLoginAt: datetime("lastLoginAt"),
    country: varchar("country", { length: 191 }),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    userIdUnique: uniqueIndex("Customer_userId_key").on(table.userId),
    minecraftUsernameUnique: uniqueIndex("Customer_minecraftUsername_key").on(table.minecraftUsername),
    minecraftUuidUnique: uniqueIndex("Customer_minecraftUuid_key").on(table.minecraftUuid),
  }),
);

export const employees = mysqlTable(
  "Employee",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userId: varchar("userId", { length: 191 }).notNull(),
    displayName: varchar("displayName", { length: 191 }).notNull(),
    department: varchar("department", { length: 191 }),
    isActive: boolean("isActive").notNull().default(true),
    disabledAt: datetime("disabledAt"),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    userIdUnique: uniqueIndex("Employee_userId_key").on(table.userId),
  }),
);

export const rolePermissions = mysqlTable(
  "RolePermission",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    employeeId: varchar("employeeId", { length: 191 }).notNull(),
    products: boolean("products").notNull().default(true),
    orders: boolean("orders").notNull().default(true),
    support: boolean("support").notNull().default(true),
    customers: boolean("customers").notNull().default(false),
    employees: boolean("employees").notNull().default(false),
    logs: boolean("logs").notNull().default(false),
    settings: boolean("settings").notNull().default(false),
    tournaments: boolean("tournaments").notNull().default(true),
    notifications: boolean("notifications").notNull().default(true),
    playerManage: boolean("playerManage").notNull().default(true),
    employeeMonitor: boolean("employeeMonitor").notNull().default(false),
    platformLogs: boolean("platformLogs").notNull().default(true),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    employeeIdUnique: uniqueIndex("RolePermission_employeeId_key").on(table.employeeId),
  }),
);

export const products = mysqlTable(
  "Product",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    slug: varchar("slug", { length: 191 }).notNull(),
    name: varchar("name", { length: 191 }).notNull(),
    description: text("description").notNull(),
    imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    active: boolean("active").notNull().default(true),
    metadata: json("metadata"),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
    category: varchar("category", { length: 191 }).notNull().default("Ranks"),
  },
  (table) => ({
    slugUnique: uniqueIndex("Product_slug_key").on(table.slug),
    activeIdx: index("Product_active_idx").on(table.active),
    categoryIdx: index("Product_category_idx").on(table.category),
  }),
);

export const coupons = mysqlTable(
  "Coupon",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    code: varchar("code", { length: 191 }).notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    discountType: varchar("discountType", { length: 50 }).notNull().default("PERCENTAGE"),
    percentageOff: int("percentageOff"),
    amountOff: decimal("amountOff", { precision: 10, scale: 2 }),
    active: boolean("active").notNull().default(true),
    maxRedemptions: int("maxRedemptions"),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    codeUnique: uniqueIndex("Coupon_code_key").on(table.code),
  }),
);

export const orders = mysqlTable(
  "Order",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    orderNumber: varchar("orderNumber", { length: 191 }).notNull(),
    userId: varchar("userId", { length: 191 }),
    customerId: varchar("customerId", { length: 191 }),
    couponId: varchar("couponId", { length: 191 }),
    minecraftUsername: varchar("minecraftUsername", { length: 191 }).notNull(),
    minecraftUuid: varchar("minecraftUuid", { length: 191 }).notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    country: varchar("country", { length: 191 }).notNull(),
    status: mysqlEnum("status", orderStatusEnumValues).notNull().default("PENDING"),
    paymentMethod: mysqlEnum("paymentMethod", paymentMethodEnumValues).notNull(),
    deliveryStatus: mysqlEnum("deliveryStatus", deliveryStatusEnumValues).notNull().default("PENDING"),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).notNull().default("0.00"),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    razorpayOrderId: varchar("razorpayOrderId", { length: 191 }),
    razorpayPaymentId: varchar("razorpayPaymentId", { length: 191 }),
    razorpaySignature: varchar("razorpaySignature", { length: 500 }),
    receipt: varchar("receipt", { length: 191 }),
    paymentVerifiedAt: datetime("paymentVerifiedAt"),
    refundedAt: datetime("refundedAt"),
    refundReason: text("refundReason"),
    deliveredAt: datetime("deliveredAt"),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    orderNumberUnique: uniqueIndex("Order_orderNumber_key").on(table.orderNumber),
    razorpayOrderIdUnique: uniqueIndex("Order_razorpayOrderId_key").on(table.razorpayOrderId),
    razorpayPaymentIdUnique: uniqueIndex("Order_razorpayPaymentId_key").on(table.razorpayPaymentId),
    receiptUnique: uniqueIndex("Order_receipt_key").on(table.receipt),
    statusIdx: index("Order_status_idx").on(table.status),
    deliveryStatusIdx: index("Order_deliveryStatus_idx").on(table.deliveryStatus),
    createdAtIdx: index("Order_createdAt_idx").on(table.createdAt),
    minecraftUsernameIdx: index("Order_minecraftUsername_idx").on(table.minecraftUsername),
  }),
);

export const orderItems = mysqlTable(
  "OrderItem",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    orderId: varchar("orderId", { length: 191 }).notNull(),
    productId: varchar("productId", { length: 191 }).notNull(),
    productName: varchar("productName", { length: 191 }).notNull(),
    quantity: int("quantity").notNull(),
    unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    createdAt: datetime("createdAt").notNull(),
  },
  (table) => ({
    orderIdIdx: index("OrderItem_orderId_fkey").on(table.orderId),
    productIdIdx: index("OrderItem_productId_fkey").on(table.productId),
  }),
);

export const activityLogs = mysqlTable(
  "ActivityLog",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    employeeId: varchar("employeeId", { length: 191 }),
    action: varchar("action", { length: 191 }).notNull(),
    entity: varchar("entity", { length: 191 }).notNull(),
    entityId: varchar("entityId", { length: 191 }),
    details: text("details"),
    severity: varchar("severity", { length: 50 }).notNull().default("INFO"),
    ipAddress: varchar("ipAddress", { length: 191 }),
    createdAt: datetime("createdAt").notNull(),
  },
  (table) => ({
    employeeIdIdx: index("ActivityLog_employeeId_fkey").on(table.employeeId),
    createdAtIdx: index("ActivityLog_createdAt_idx").on(table.createdAt),
    entityIdx: index("ActivityLog_entity_idx").on(table.entity),
    severityIdx: index("ActivityLog_severity_idx").on(table.severity),
  }),
);

export const notifications = mysqlTable(
  "Notification",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userId: varchar("userId", { length: 191 }).notNull(),
    title: varchar("title", { length: 191 }).notNull(),
    message: text("message").notNull(),
    type: varchar("type", { length: 50 }).notNull().default("INFO"),
    read: boolean("read").notNull().default(false),
    link: varchar("link", { length: 500 }),
    createdAt: datetime("createdAt").notNull(),
  },
  (table) => ({
    userIdIdx: index("Notification_userId_fkey").on(table.userId),
    createdAtIdx: index("Notification_createdAt_idx").on(table.createdAt),
  }),
);

export const supportTickets = mysqlTable(
  "SupportTicket",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userId: varchar("userId", { length: 191 }),
    customerId: varchar("customerId", { length: 191 }),
    assignedToId: varchar("assignedToId", { length: 191 }),
    subject: varchar("subject", { length: 191 }).notNull(),
    message: text("message").notNull(),
    status: mysqlEnum("status", ticketStatusEnumValues).notNull().default("OPEN"),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    assignedToIdx: index("SupportTicket_assignedToId_fkey").on(table.assignedToId),
    customerIdIdx: index("SupportTicket_customerId_fkey").on(table.customerId),
    userIdIdx: index("SupportTicket_userId_fkey").on(table.userId),
    statusIdx: index("SupportTicket_status_idx").on(table.status),
  }),
);

export const serverReviews = mysqlTable(
  "ServerReview",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userId: varchar("userId", { length: 191 }),
    customerId: varchar("customerId", { length: 191 }),
    minecraftUsername: varchar("minecraftUsername", { length: 191 }).notNull(),
    rating: int("rating").notNull(),
    title: varchar("title", { length: 191 }).notNull(),
    message: text("message").notNull(),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    customerIdIdx: index("ServerReview_customerId_fkey").on(table.customerId),
    userIdIdx: index("ServerReview_userId_fkey").on(table.userId),
    minecraftUsernameIdx: index("ServerReview_minecraftUsername_idx").on(table.minecraftUsername),
  }),
);

export const tournaments = mysqlTable(
  "Tournament",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    title: varchar("title", { length: 191 }).notNull(),
    bannerUrl: varchar("bannerUrl", { length: 500 }),
    type: mysqlEnum("type", tournamentTypeEnumValues).notNull().default("SOLO"),
    gameMode: varchar("gameMode", { length: 191 }).notNull(),
    dateTime: datetime("dateTime").notNull(),
    registrationDeadline: datetime("registrationDeadline").notNull(),
    maxParticipants: int("maxParticipants").notNull(),
    entryFee: decimal("entryFee", { precision: 10, scale: 2 }),
    prizePool: varchar("prizePool", { length: 191 }),
    discordLink: varchar("discordLink", { length: 500 }),
    rules: text("rules").notNull(),
    serverIp: varchar("serverIp", { length: 191 }),
    status: mysqlEnum("status", tournamentStatusEnumValues).notNull().default("UPCOMING"),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    statusIdx: index("Tournament_status_idx").on(table.status),
    dateTimeIdx: index("Tournament_dateTime_idx").on(table.dateTime),
  }),
);

export const tournamentRegistrations = mysqlTable(
  "TournamentRegistration",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    tournamentId: varchar("tournamentId", { length: 191 }).notNull(),
    userId: varchar("userId", { length: 191 }),
    minecraftUsername: varchar("minecraftUsername", { length: 191 }).notNull(),
    minecraftUuid: varchar("minecraftUuid", { length: 191 }),
    discordUsername: varchar("discordUsername", { length: 191 }).notNull(),
    discordId: varchar("discordId", { length: 191 }),
    teamName: varchar("teamName", { length: 191 }),
    teamMembers: json("teamMembers"),
    email: varchar("email", { length: 191 }).notNull(),
    region: varchar("region", { length: 191 }).notNull(),
    age: int("age"),
    agreedToRules: boolean("agreedToRules").notNull().default(false),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    tournamentUsernameUnique: uniqueIndex("TournamentRegistration_tournamentId_minecraftUsername_key").on(
      table.tournamentId,
      table.minecraftUsername,
    ),
    tournamentIdIdx: index("TournamentRegistration_tournamentId_fkey").on(table.tournamentId),
    userIdIdx: index("TournamentRegistration_userId_fkey").on(table.userId),
    minecraftUsernameIdx: index("TournamentRegistration_minecraftUsername_idx").on(table.minecraftUsername),
  }),
);

export const tournamentAnnouncements = mysqlTable(
  "TournamentAnnouncement",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    tournamentId: varchar("tournamentId", { length: 191 }).notNull(),
    title: varchar("title", { length: 191 }).notNull(),
    message: text("message").notNull(),
    type: varchar("type", { length: 50 }).notNull().default("INFO"),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    tournamentIdIdx: index("TournamentAnnouncement_tournamentId_fkey").on(table.tournamentId),
    createdAtIdx: index("TournamentAnnouncement_createdAt_idx").on(table.createdAt),
  }),
);

export const siteNotifications = mysqlTable(
  "SiteNotification",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    title: varchar("title", { length: 191 }).notNull(),
    message: text("message").notNull(),
    type: varchar("type", { length: 50 }).notNull().default("INFO"),
    link: varchar("link", { length: 500 }),
    startAt: datetime("startAt").notNull(),
    expireAt: datetime("expireAt"),
    active: boolean("active").notNull().default(true),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    activeIdx: index("SiteNotification_active_idx").on(table.active),
    startAtIdx: index("SiteNotification_startAt_idx").on(table.startAt),
    expireAtIdx: index("SiteNotification_expireAt_idx").on(table.expireAt),
    createdAtIdx: index("SiteNotification_createdAt_idx").on(table.createdAt),
  }),
);

export const playerNotes = mysqlTable(
  "PlayerNote",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    employeeId: varchar("employeeId", { length: 191 }),
    customerId: varchar("customerId", { length: 191 }),
    minecraftUsername: varchar("minecraftUsername", { length: 191 }).notNull(),
    note: text("note").notNull(),
    severity: varchar("severity", { length: 50 }).notNull().default("INFO"),
    createdAt: datetime("createdAt").notNull(),
  },
  (table) => ({
    employeeIdIdx: index("PlayerNote_employeeId_fkey").on(table.employeeId),
    customerIdIdx: index("PlayerNote_customerId_fkey").on(table.customerId),
    minecraftUsernameIdx: index("PlayerNote_minecraftUsername_idx").on(table.minecraftUsername),
    createdAtIdx: index("PlayerNote_createdAt_idx").on(table.createdAt),
  }),
);

export const playerBans = mysqlTable(
  "PlayerBan",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    employeeId: varchar("employeeId", { length: 191 }),
    customerId: varchar("customerId", { length: 191 }),
    minecraftUsername: varchar("minecraftUsername", { length: 191 }).notNull(),
    reason: text("reason").notNull(),
    tournamentId: varchar("tournamentId", { length: 191 }),
    bannedUntil: datetime("bannedUntil"),
    active: boolean("active").notNull().default(true),
    createdAt: datetime("createdAt").notNull(),
  },
  (table) => ({
    employeeIdIdx: index("PlayerBan_employeeId_fkey").on(table.employeeId),
    customerIdIdx: index("PlayerBan_customerId_fkey").on(table.customerId),
    tournamentIdIdx: index("PlayerBan_tournamentId_fkey").on(table.tournamentId),
    minecraftUsernameIdx: index("PlayerBan_minecraftUsername_idx").on(table.minecraftUsername),
    activeIdx: index("PlayerBan_active_idx").on(table.active),
    createdAtIdx: index("PlayerBan_createdAt_idx").on(table.createdAt),
  }),
);

export const playerRanks = mysqlTable(
  "PlayerRank",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    customerId: varchar("customerId", { length: 191 }).notNull(),
    minecraftUsername: varchar("minecraftUsername", { length: 191 }).notNull(),
    rank: varchar("rank", { length: 191 }).notNull(),
    assignedBy: varchar("assignedBy", { length: 191 }),
    assignedAt: datetime("assignedAt").notNull(),
    expiresAt: datetime("expiresAt"),
    active: boolean("active").notNull().default(true),
  },
  (table) => ({
    customerRankUnique: uniqueIndex("PlayerRank_customerId_rank_key").on(table.customerId, table.rank),
    customerIdIdx: index("PlayerRank_customerId_fkey").on(table.customerId),
    minecraftUsernameIdx: index("PlayerRank_minecraftUsername_idx").on(table.minecraftUsername),
    activeIdx: index("PlayerRank_active_idx").on(table.active),
  }),
);

export const youTubeCache = mysqlTable(
  "YouTubeCache",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    cacheKey: varchar("cacheKey", { length: 191 }).notNull(),
    data: json("data").notNull(),
    cachedAt: datetime("cachedAt").notNull(),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    cacheKeyUnique: uniqueIndex("YouTubeCache_cacheKey_key").on(table.cacheKey),
  }),
);

export const youTubeContent = mysqlTable(
  "YouTubeContent",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    channelId: varchar("channelId", { length: 191 }).notNull(),
    videoId: varchar("videoId", { length: 191 }).notNull(),
    title: varchar("title", { length: 191 }).notNull(),
    description: text("description").notNull(),
    thumbnailUrl: varchar("thumbnailUrl", { length: 500 }),
    publishedAt: datetime("publishedAt"),
    contentType: varchar("contentType", { length: 50 }).notNull().default("UPLOAD"),
    isLive: boolean("isLive").notNull().default(false),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    videoIdUnique: uniqueIndex("YouTubeContent_videoId_key").on(table.videoId),
    channelIdIdx: index("YouTubeContent_channelId_idx").on(table.channelId),
  }),
);

export const featuredStreams = mysqlTable(
  "FeaturedStream",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    videoId: varchar("videoId", { length: 191 }).notNull(),
    channelId: varchar("channelId", { length: 191 }).notNull(),
    channelTitle: varchar("channelTitle", { length: 191 }).notNull(),
    title: varchar("title", { length: 191 }).notNull(),
    description: text("description").notNull(),
    thumbnailUrl: varchar("thumbnailUrl", { length: 500 }),
    liveViewers: int("liveViewers").notNull().default(0),
    status: varchar("status", { length: 50 }).notNull().default("PENDING"),
    moderatedById: varchar("moderatedById", { length: 191 }),
    moderatedAt: datetime("moderatedAt"),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    videoIdUnique: uniqueIndex("FeaturedStream_videoId_key").on(table.videoId),
    statusIdx: index("FeaturedStream_status_idx").on(table.status),
  }),
);

export const streamBlacklist = mysqlTable(
  "StreamBlacklist",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    channelId: varchar("channelId", { length: 191 }).notNull(),
    channelTitle: varchar("channelTitle", { length: 191 }),
    reason: text("reason"),
    createdById: varchar("createdById", { length: 191 }),
    createdAt: datetime("createdAt").notNull(),
  },
  (table) => ({
    channelIdUnique: uniqueIndex("StreamBlacklist_channelId_key").on(table.channelId),
  }),
);

export const ticketReplies = mysqlTable(
  "TicketReply",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    ticketId: varchar("ticketId", { length: 191 }).notNull(),
    employeeId: varchar("employeeId", { length: 191 }),
    authorName: varchar("authorName", { length: 191 }).notNull(),
    message: text("message").notNull(),
    createdAt: datetime("createdAt").notNull(),
  },
  (table) => ({
    ticketIdIdx: index("TicketReply_ticketId_fkey").on(table.ticketId),
    employeeIdIdx: index("TicketReply_employeeId_fkey").on(table.employeeId),
  }),
);

export const tournamentMatches = mysqlTable(
  "TournamentMatch",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    tournamentId: varchar("tournamentId", { length: 191 }).notNull(),
    round: int("round").notNull(),
    matchIndex: int("matchIndex").notNull(),
    player1Id: varchar("player1Id", { length: 191 }),
    player2Id: varchar("player2Id", { length: 191 }),
    winnerId: varchar("winnerId", { length: 191 }),
    score1: int("score1"),
    score2: int("score2"),
    status: mysqlEnum("status", matchStatusEnumValues).notNull().default("SCHEDULED"),
    scheduledAt: datetime("scheduledAt"),
    playedAt: datetime("playedAt"),
    notes: text("notes"),
    createdAt: datetime("createdAt").notNull(),
    updatedAt: datetime("updatedAt").notNull(),
  },
  (table) => ({
    tournamentRoundMatchUnique: uniqueIndex("TournamentMatch_tournamentId_round_matchIndex_key").on(
      table.tournamentId,
      table.round,
      table.matchIndex,
    ),
    tournamentIdIdx: index("TournamentMatch_tournamentId_fkey").on(table.tournamentId),
    player1IdIdx: index("TournamentMatch_player1Id_fkey").on(table.player1Id),
    player2IdIdx: index("TournamentMatch_player2Id_fkey").on(table.player2Id),
    winnerIdIdx: index("TournamentMatch_winnerId_fkey").on(table.winnerId),
  }),
);