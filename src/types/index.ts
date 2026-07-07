export interface User {
  id: string;
  device_id: string;
  name: string;
  avatar: string; // Avatar name or URL
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  member_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  user?: User; // Joined user info
}

export interface Expense {
  id: string;
  group_id: string; // References Group.id
  title: string;
  amount: number;
  paid_by: string; // References User.id
  category_id: string;
  date: string; // ISO string
  notes?: string;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  is_paid: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Emoji or Icon name
  is_custom?: boolean;
}

export interface Settlement {
  id: string;
  group_id: string;
  paid_by: string; // User ID
  paid_to: string; // User ID
  amount: number;
  date: string;
}

export interface Saving {
  id: string;
  user_id: string;
  title: string;
  amount_saved: number;
  category: string;
  date: string;
  note?: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
}

// UI helper interfaces
export interface BalanceDetail {
  user_id: string;
  name: string;
  avatar: string;
  net_balance: number; // Positive means they are owed, negative means they owe
}

export interface Debt {
  from: string; // User ID
  from_name: string;
  to: string; // User ID
  to_name: string;
  amount: number;
}
