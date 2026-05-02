import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  edit_token: text("edit_token").notNull(),
  title: text("title").notNull(),
  builder_name: text("builder_name").notNull().default(""),
  one_liner: text("one_liner").notNull().default(""),
  starting_state: text("starting_state").notNull().default(""),
  current_state: text("current_state").notNull().default(""),
  replit_url: text("replit_url").notNull().default(""),
  demo_url: text("demo_url").notNull().default(""),
  start_time: timestamp("start_time", { withTimezone: true }),
  published: boolean("published").notNull().default(false),
  generated_summary: text("generated_summary").notNull().default(""),
  generated_demo_script: text("generated_demo_script").notNull().default(""),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const milestonesTable = pgTable("milestones", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  sort_order: integer("sort_order").notNull().default(0),
  occurred_at: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  type: text("type").notNull().default("update"),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  blocker: boolean("blocker").notNull().default(false),
  breakthrough: boolean("breakthrough").notNull().default(false),
  screenshot_data: text("screenshot_data"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Project = typeof projectsTable.$inferSelect;
export type Milestone = typeof milestonesTable.$inferSelect;
