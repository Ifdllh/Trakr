import fs from 'fs';

const newSchema = `import { integer, pgTable, serial, text, timestamp, boolean, doublePrecision, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const globalBudgets = pgTable('global_budgets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  periodId: integer('period_id'),
  totalTargetAmount: doublePrecision('total_target_amount'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('global_budgets_user_id_idx').on(table.userId),
  index('global_budgets_period_id_idx').on(table.periodId),
]);

export const masterPeriods = pgTable('master_periods', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  name: text('name'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  isActive: boolean('is_active'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('master_periods_user_id_idx').on(table.userId),
]);

export const masterTags = pgTable('master_tags', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  tagName: text('tag_name'),
  description: text('description'),
  isActive: boolean('is_active'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('master_tags_user_id_idx').on(table.userId),
]);

export const masterAccounts = pgTable('master_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  accountName: text('account_name'),
  accountType: text('account_type'),
  balance: doublePrecision('balance'),
  color: text('color'),
  icon: text('icon'),
  accountNumber: text('account_number'),
  includeInNetWorth: boolean('include_in_net_worth'),
  isActive: boolean('is_active'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('master_accounts_user_id_idx').on(table.userId),
]);

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  type: text('type'),
  amount: doublePrecision('amount'),
  category: text('category'),
  subcategory: text('subcategory'),
  description: text('description'),
  date: text('date'),
  accountId: integer('account_id'),
  destinationAccountId: integer('destination_account_id'),
  assetId: integer('asset_id'),
  tagId: integer('tag_id'),
  contactId: integer('contact_id'),
  periodId: integer('period_id'),
  splitGroupId: text('split_group_id'),
  attachmentUrl: text('attachment_url'),
  isRecurring: boolean('is_recurring'),
  recurringFrequency: text('recurring_frequency'),
  recurringEndDate: text('recurring_end_date'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('transactions_user_id_idx').on(table.userId),
  index('transactions_account_id_idx').on(table.accountId),
  index('transactions_dest_account_id_idx').on(table.destinationAccountId),
  index('transactions_asset_id_idx').on(table.assetId),
  index('transactions_tag_id_idx').on(table.tagId),
  index('transactions_contact_id_idx').on(table.contactId),
  index('transactions_period_id_idx').on(table.periodId),
  index('transactions_user_date_idx').on(table.userId, table.date),
]);

export const masterAssets = pgTable('master_assets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  assetName: text('asset_name'),
  assetCategory: text('asset_category'),
  currentValue: doublePrecision('current_value'),
  isActive: boolean('is_active'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('master_assets_user_id_idx').on(table.userId),
]);

export const budgetAllocations = pgTable('budget_allocations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  periodId: integer('period_id'),
  globalBudgetId: integer('global_budget_id'),
  categoryId: text('category_id'),
  type: text('type'),
  value: doublePrecision('value'),
  calculatedAmount: doublePrecision('calculated_amount'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('budget_allocations_user_id_idx').on(table.userId),
  index('budget_allocations_period_id_idx').on(table.periodId),
  index('budget_allocations_global_budget_id_idx').on(table.globalBudgetId),
]);

export const masterCategories = pgTable('master_categories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  name: text('name'),
  type: text('type'),
  parentCategory: text('parent_category'),
  iconName: text('icon_name'),
  colorClass: text('color_class'),
  colorHex: text('color_hex'),
  subcategories: text('subcategories').array(),
  inactiveSubcategories: text('inactive_subcategories').array(),
  isActive: boolean('is_active'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('master_categories_user_id_idx').on(table.userId),
]);

export const masterContacts = pgTable('master_contacts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  contactName: text('contact_name'),
  contactType: text('contact_type'),
  isActive: boolean('is_active'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('master_contacts_user_id_idx').on(table.userId),
]);
`;

fs.writeFileSync('src/db/schema.ts', newSchema);
console.log("Schema updated with indexes.");
