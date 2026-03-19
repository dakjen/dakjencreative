import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { pgTable, text, timestamp, boolean, serial, varchar, integer } from 'drizzle-orm/pg-core'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql)

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('team'),
  initials: varchar('initials', { length: 4 }).notNull(),
  hourlyRate: integer('hourly_rate'),
  weeklyHours: integer('weekly_hours'),
  paySchedule: varchar('pay_schedule', { length: 30 }),
  createdAt: timestamp('created_at').defaultNow(),
})

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  text: text('text').notNull(),
  tag: varchar('tag', { length: 20 }).notNull().default('djc'),
  due: text('due'),
  assignee: text('assignee'),
  done: boolean('done').notNull().default(false),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
})

export const contracts = pgTable('contracts', {
  id: serial('id').primaryKey(),
  clientName: text('client_name').notNull(),
  businessLine: varchar('business_line', { length: 30 }).notNull(),
  stage: varchar('stage', { length: 20 }).notNull().default('pipeline'),
  probability: integer('probability').notNull().default(50),
  contractValue: integer('contract_value'),
  monthlyRetainer: integer('monthly_retainer'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
})

export type User        = typeof users.$inferSelect
export type Task        = typeof tasks.$inferSelect
export type NewTask     = typeof tasks.$inferInsert
export type Contract    = typeof contracts.$inferSelect
export type NewContract = typeof contracts.$inferInsert
