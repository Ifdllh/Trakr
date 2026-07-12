import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, doublePrecision, unique } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const masterCategories = pgTable('master_categories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  iconName: text('icon_name').notNull(),
  colorClass: text('color_class').notNull(),
  colorHex: text('color_hex').default('#6366F1').notNull(),
  parentCategory: text('parent_category'),
  subcategories: text('subcategories').array(),
  isActive: boolean('is_active').default(true),
  inactiveSubcategories: text('inactive_subcategories').array(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const masterAccounts = pgTable('master_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  accountName: text('account_name').notNull(),
  accountType: text('account_type').notNull(),
  accountNumber: text('account_number'),
  balance: doublePrecision('balance').notNull(),
  color: text('color').default('#4f46e5'),
  icon: text('icon'),
  includeInNetWorth: boolean('include_in_net_worth').default(true),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const masterAssets = pgTable('master_assets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  assetName: text('asset_name').notNull(),
  assetCategory: text('asset_category').notNull(),
  currentValue: doublePrecision('current_value').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const masterTags = pgTable('master_tags', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  tagName: text('tag_name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const masterContacts = pgTable('master_contacts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  contactName: text('contact_name').notNull(),
  contactType: text('contact_type').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const masterPeriods = pgTable('master_periods', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const globalBudgets = pgTable('global_budgets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  periodId: integer('period_id').references(() => masterPeriods.id).notNull(),
  totalTargetAmount: doublePrecision('total_target_amount').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  uniqPeriodUser: unique('uniq_period_user').on(t.periodId, t.userId),
}));

export const budgetAllocations = pgTable('budget_allocations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  periodId: integer('period_id').references(() => masterPeriods.id).notNull(),
  globalBudgetId: integer('global_budget_id').references(() => globalBudgets.id).notNull(),
  categoryId: text('category_id').notNull(),
  type: text('type').notNull(), // 'amount' | 'percentage'
  value: doublePrecision('value').notNull(),
  calculatedAmount: doublePrecision('calculated_amount').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(),
  amount: doublePrecision('amount').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  date: text('date').notNull(),
  description: text('description'),
  accountId: integer('account_id').references(() => masterAccounts.id),
  destinationAccountId: integer('destination_account_id').references(() => masterAccounts.id),
  assetId: integer('asset_id').references(() => masterAssets.id),
  tagId: integer('tag_id').references(() => masterTags.id),
  contactId: integer('contact_id').references(() => masterContacts.id),
  periodId: integer('period_id').references(() => masterPeriods.id),
  splitGroupId: text('split_group_id'),
  attachmentUrl: text('attachment_url'),
  isRecurring: boolean('is_recurring').default(false),
  recurringFrequency: text('recurring_frequency'),
  recurringEndDate: text('recurring_end_date'),
  createdAt: timestamp('created_at').defaultNow(),
});
