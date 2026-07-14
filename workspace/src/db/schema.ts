import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Define the 'users' table.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// A general transactions table to match the current Firestore structure
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type'),
  amount: text('amount'),
  category: text('category'),
  subcategory: text('subcategory'),
  description: text('description'),
  date: text('date'),
  accountId: text('account_id'),
  destinationAccountId: text('destination_account_id'),
  assetId: text('asset_id'),
  tagId: text('tag_id'),
  contactId: text('contact_id'),
  periodId: text('period_id'),
  splitGroupId: text('split_group_id'),
  attachmentUrl: text('attachment_url'),
  recurringConfig: jsonb('recurring_config'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// A masterdata table storing generic JSON for collections
export const masterdata = pgTable('masterdata', {
  id: serial('id').primaryKey(),
  collection: text('collection').notNull(),
  userId: text('user_id').notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
