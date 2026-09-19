-- Eternal Flame / Flamekeeper — SQLite schema (generated from prisma/schema.prisma)
-- Used by scripts/init-db.mjs to bootstrap a fresh database at container start.
-- In Docker this file is regenerated from the schema during the build stage.

CREATE TABLE "User" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  emailVerified DATETIME,
  passwordHash TEXT NOT NULL,
  name TEXT,
  image TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  status TEXT NOT NULL DEFAULT 'PENDING_EMAIL',
  referredById TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Account" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"(provider, providerAccountId);

CREATE TABLE "Session" (
  id TEXT PRIMARY KEY,
  sessionToken TEXT UNIQUE NOT NULL,
  userId TEXT NOT NULL,
  expires DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE "VerificationToken" (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires DATETIME NOT NULL
);
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"(identifier, token);

CREATE TABLE "Profile" (
  id TEXT PRIMARY KEY,
  userId TEXT UNIQUE NOT NULL,
  displayName TEXT,
  bio TEXT,
  avatar TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE "Application" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  characterName TEXT NOT NULL,
  server TEXT NOT NULL,
  faction TEXT NOT NULL,
  class TEXT NOT NULL,
  spec TEXT NOT NULL,
  itemLevel INTEGER,
  raidExperience TEXT,
  playableTimes TEXT,
  kookId TEXT,
  wechatId TEXT,
  applicationCode TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  officerNote TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE "Post" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  coverImage TEXT,
  category TEXT NOT NULL,
  tags TEXT,
  isPinned BOOLEAN NOT NULL DEFAULT 0,
  isPublished BOOLEAN NOT NULL DEFAULT 0,
  publishedAt DATETIME,
  viewCount INTEGER NOT NULL DEFAULT 0,
  attachmentUrl TEXT,
  attachmentName TEXT,
  attachmentSize INTEGER,
  authorId TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (authorId) REFERENCES User(id)
);

CREATE TABLE "Page" (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Character" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  server TEXT NOT NULL,
  faction TEXT NOT NULL,
  class TEXT NOT NULL,
  spec TEXT NOT NULL,
  role TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 80,
  itemLevel INTEGER,
  mythicScore INTEGER,
  raidProgress TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  isPublic BOOLEAN NOT NULL DEFAULT 1,
  userId TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id)
);

CREATE TABLE "RaidProgress" (
  id TEXT PRIMARY KEY,
  raidName TEXT NOT NULL,
  bossName TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  defeatedAt DATETIME NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AnalyticsSnapshot" (
  id TEXT PRIMARY KEY,
  snapshotDate DATETIME UNIQUE NOT NULL,
  data TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Addon" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  applicableClass TEXT,
  gameVersion TEXT,
  downloadUrl TEXT,
  waString TEXT,
  tutorialContent TEXT,
  screenshotUrl TEXT,
  isRecommended BOOLEAN NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Event" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  eventType TEXT NOT NULL,
  startTime DATETIME NOT NULL,
  endTime DATETIME NOT NULL,
  maxSlots INTEGER,
  location TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "EventSignup" (
  id TEXT PRIMARY KEY,
  eventId TEXT NOT NULL,
  userId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (eventId) REFERENCES Event(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX "EventSignup_eventId_userId_key" ON "EventSignup"(eventId, userId);

CREATE TABLE "Media" (
  id TEXT PRIMARY KEY,
  title TEXT,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  album TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Setting" (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE "AuditLog" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id)
);
