-- MoneyMate Supabase PostgreSQL Schema

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL, -- Emoji or avatar key
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for device_id lookup
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);

-- 2. GROUPS TABLE
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. GROUP_MEMBERS TABLE
CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(group_id, user_id)
);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, -- Predefined string id like 'food', 'travel'
    name TEXT NOT NULL,
    icon TEXT NOT NULL
);

-- Insert default categories
INSERT INTO categories (id, name, icon) VALUES
('food', 'Food', '🍔'),
('online_grocery', 'Online Grocery', '📦'),
('offline_grocery', 'Offline Grocery', '🛒'),
('shopping', 'Shopping', '🛍️'),
('travel', 'Travel', '✈️'),
('entertainment', 'Entertainment', '🎬'),
('bills', 'Bills', '💵'),
('health', 'Health', '🏥'),
('home', 'Home', '🏠'),
('other', 'Other', '🏷️')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- 5. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    group_id TEXT REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    paid_by TEXT REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    category_id TEXT NOT NULL, -- references categories(id) or custom string
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index on group_id for dashboard list query
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);

-- 6. EXPENSE_SPLITS TABLE
CREATE TABLE IF NOT EXISTS expense_splits (
    id TEXT PRIMARY KEY,
    expense_id TEXT REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    amount_owed NUMERIC(12, 2) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE NOT NULL,
    UNIQUE(expense_id, user_id)
);

-- 7. SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    group_id TEXT REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    paid_by TEXT REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    paid_to TEXT REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index on group_id for group-level settlement query
CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON settlements(group_id);

-- 8. SAVINGS TABLE
CREATE TABLE IF NOT EXISTS savings (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    amount_saved NUMERIC(12, 2) NOT NULL,
    category TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT
);

-- Index on user_id for analytics/insights query
CREATE INDEX IF NOT EXISTS idx_savings_user_id ON savings(user_id);

-- 9. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    monthly_limit NUMERIC(12, 2) NOT NULL,
    UNIQUE(user_id, category)
);
