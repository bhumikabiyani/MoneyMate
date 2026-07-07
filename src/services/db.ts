import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  User,
  Group,
  GroupMember,
  Expense,
  ExpenseSplit,
  Category,
  Settlement,
  Saving,
  Budget,
  BalanceDetail,
  Debt
} from '../types';
import { DEFAULT_CATEGORIES } from '../utils/constants';

// Local storage key constants
const KEYS = {
  USERS: 'moneymate_local_users',
  GROUPS: 'moneymate_local_groups',
  GROUP_MEMBERS: 'moneymate_local_group_members',
  EXPENSES: 'moneymate_local_expenses',
  EXPENSE_SPLITS: 'moneymate_local_expense_splits',
  SETTLEMENTS: 'moneymate_local_settlements',
  SAVINGS: 'moneymate_local_savings',
  BUDGETS: 'moneymate_local_budgets',
  CUSTOM_CATEGORIES: 'moneymate_local_custom_categories',
};

// Generic local helper to get data
async function getLocalData<T>(key: string, defaultValue: T[] = []): Promise<T[]> {
  try {
    const data = await AsyncStorage.getItem(key);
    let parsed = data ? JSON.parse(data) : defaultValue;
    // No hardcoded user preloading.
    return parsed;
  } catch (error) {
    console.error(`Error reading key ${key} from AsyncStorage:`, error);
    return defaultValue;
  }
}

// Generic local helper to save data
async function saveLocalData<T>(key: string, data: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error writing key ${key} to AsyncStorage:`, error);
  }
}

// Database Service
export const DBService = {
  // ==========================================
  // USERS SERVICES
  // ==========================================
  async getUser(userId: string): Promise<User | null> {
    const users = await getLocalData<User>(KEYS.USERS);
    const user = users.find((u) => u.id === userId) || null;

    // Sync background check if online
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
        if (data && !error) {
          // Update local cache
          const updatedUsers = users.map(u => u.id === userId ? data : u);
          await saveLocalData(KEYS.USERS, updatedUsers);
          return data as User;
        } else if ((!data || error) && user) {
          // If user exists locally but is missing from Supabase, upsert it
          await supabase.from('users').upsert({
            id: user.id,
            device_id: user.device_id,
            name: user.name,
            avatar: user.avatar,
            created_at: user.created_at
          });
        }
      } catch (e) {
        // Ignored, use local
      }
    }
    return user;
  },

  async getAllUsers(): Promise<User[]> {
    return await getLocalData<User>(KEYS.USERS);
  },

  async createUser(name: string, avatar: string, deviceId: string): Promise<User> {
    const users = await getLocalData<User>(KEYS.USERS);
    const id = Math.random().toString(36).substring(2, 15);

    const existingIndex = users.findIndex(u => u.name.toLowerCase().trim() === name.toLowerCase().trim());

    const newUser: User = {
      id: existingIndex >= 0 ? users[existingIndex].id : id,
      device_id: deviceId,
      name,
      avatar,
      created_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      users[existingIndex] = newUser;
    } else {
      users.push(newUser);
    }

    await saveLocalData(KEYS.USERS, users);

    // Sync to Supabase in background (non-blocking)
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          await supabase.from('users').upsert({
            id: newUser.id,
            device_id: newUser.device_id,
            name: newUser.name,
            avatar: newUser.avatar,
            created_at: newUser.created_at
          });
        } catch (error) {
          console.error('Supabase user creation sync failed:', error);
        }
      })();
    }

    return newUser;
  },

  // Helper to fetch other users (members) details
  async getUsersByIds(userIds: string[]): Promise<User[]> {
    const users = await getLocalData<User>(KEYS.USERS);
    return users.filter(u => userIds.includes(u.id));
  },

  // ==========================================
  // GROUPS SERVICES
  // ==========================================
  async getGroups(userId: string): Promise<Group[]> {
    const members = await getLocalData<GroupMember>(KEYS.GROUP_MEMBERS);
    const groups = await getLocalData<Group>(KEYS.GROUPS);

    // Find groups user is member of
    const userGroupIds = members.filter(m => m.user_id === userId).map(m => m.group_id);
    const userGroups = groups.filter(g => userGroupIds.includes(g.id));

    // Try fetch fresh groups from Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: remoteMembers } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId);

        if (remoteMembers && remoteMembers.length > 0) {
          const remoteGroupIds = remoteMembers.map(rm => rm.group_id);
          const { data: remoteGroups } = await supabase
            .from('groups')
            .select('*')
            .in('id', remoteGroupIds);

          if (remoteGroups) {
            // Update local cache
            const allGroups = await getLocalData<Group>(KEYS.GROUPS);
            const filteredAll = allGroups.filter(g => !remoteGroupIds.includes(g.id));
            const updated = [...filteredAll, ...remoteGroups];
            await saveLocalData(KEYS.GROUPS, updated);

            // Also update local cache of group_members!
            const allMembers = await getLocalData<GroupMember>(KEYS.GROUP_MEMBERS);
            const filteredMembers = allMembers.filter(m => !(m.user_id === userId && remoteGroupIds.includes(m.group_id)));
            const newMembers: GroupMember[] = remoteMembers.map(rm => ({
              id: Math.random().toString(36).substring(2, 15),
              group_id: rm.group_id,
              user_id: userId,
              joined_at: new Date().toISOString()
            }));
            await saveLocalData(KEYS.GROUP_MEMBERS, [...filteredMembers, ...newMembers]);

            // Combine remote groups with any local unsynced/offline groups to avoid losing them
            const localUnsyncedGroups = userGroups.filter(g => !remoteGroupIds.includes(g.id));
            return [...localUnsyncedGroups, ...remoteGroups] as Group[];
          }
        }
      } catch (e) {
        // Ignored
      }
    }

    return userGroups;
  },

  async createGroup(name: string, userId: string, isPersonal: boolean = false): Promise<Group> {
    const groups = await getLocalData<Group>(KEYS.GROUPS);
    const members = await getLocalData<GroupMember>(KEYS.GROUP_MEMBERS);

    const groupId = Math.random().toString(36).substring(2, 15);
    const newGroup: Group = {
      id: groupId,
      name,
      created_by: userId,
      created_at: new Date().toISOString(),
    };

    const newMember: GroupMember = {
      id: Math.random().toString(36).substring(2, 15),
      group_id: groupId,
      user_id: userId,
      joined_at: new Date().toISOString(),
    };
    members.push(newMember);

    let otherMember: GroupMember | null = null;
    if (!isPersonal) {
      const users = await getLocalData<User>(KEYS.USERS);
      const otherUser = users.find(u => u.id !== userId);
      const otherUserId = otherUser ? otherUser.id : 'user_2';
      otherMember = {
        id: Math.random().toString(36).substring(2, 15),
        group_id: groupId,
        user_id: otherUserId,
        joined_at: new Date().toISOString(),
      };
      members.push(otherMember);
    }

    // Save locally
    groups.push(newGroup);
    await saveLocalData(KEYS.GROUPS, groups);
    await saveLocalData(KEYS.GROUP_MEMBERS, members);

    // Sync to Supabase in background (non-blocking)
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          // Ensure creator and other users exist in Supabase users table first to prevent FK violation
          const creatorUser = await DBService.getUser(userId);
          const usersToUpsert: User[] = [];
          if (creatorUser) {
            usersToUpsert.push(creatorUser);
          }
          if (!isPersonal && otherMember) {
            const otherUserId = otherMember.user_id;
            const otherUser = await DBService.getUser(otherUserId);
            if (otherUser) {
              usersToUpsert.push(otherUser);
            }
          }

          if (usersToUpsert.length > 0) {
            await supabase.from('users').upsert(
              usersToUpsert.map(u => ({
                id: u.id,
                device_id: u.device_id,
                name: u.name,
                avatar: u.avatar,
                created_at: u.created_at
              }))
            );
          }

          const { error } = await supabase.from('groups').upsert({
            id: newGroup.id,
            name: newGroup.name,
            created_by: newGroup.created_by
          });

          if (error) {
            console.log("GROUP CREATE FAILED", error);
            return;
          }

          console.log("GROUP CREATED SUCCESSFULLY");

          const membersToUpsert = [
            {
              id: newMember.id,
              group_id: newMember.group_id,
              user_id: newMember.user_id,
              joined_at: newMember.joined_at
            }
          ];

          if (otherMember) {
            membersToUpsert.push({
              id: otherMember.id,
              group_id: otherMember.group_id,
              user_id: otherMember.user_id,
              joined_at: otherMember.joined_at
            });
          }

          const membersResult = await supabase.from('group_members').upsert(membersToUpsert);

          if (membersResult.error) {
            console.log("MEMBERS CREATE FAILED", membersResult.error);
          } else {
            console.log("MEMBERS CREATED SUCCESSFULLY");
          }
        } catch (error) {
          console.log(
            "SUPABASE GROUP ERROR FULL:",
            JSON.stringify(error, null, 2)
          );
        }
      })();
    }

    return newGroup;
  },

  async getGroupMembers(groupId: string): Promise<User[]> {
    const members = await getLocalData<GroupMember>(KEYS.GROUP_MEMBERS);
    const users = await getLocalData<User>(KEYS.USERS);

    // Filter group members
    const groupUserIds = members.filter(m => m.group_id === groupId).map(m => m.user_id);
    let groupUsers = users.filter(u => groupUserIds.includes(u.id));

    // Try fetching remote
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('group_members')
          .select('user_id, users(*)')
          .eq('group_id', groupId);

        if (data && !error && data.length > 0) {
          const remoteUsers = (data.map(item => item.users) as any).filter(Boolean) as User[];
          // Update cache
          const uniqueNewUsers = remoteUsers.filter(ru => !users.some(u => u.id === ru.id));
          if (uniqueNewUsers.length > 0) {
            const updatedUsers = [...users, ...uniqueNewUsers];
            await saveLocalData(KEYS.USERS, updatedUsers);
          }
          // Also sync group_members cache
          const localMembers = await getLocalData<GroupMember>(KEYS.GROUP_MEMBERS);
          const otherMembers = localMembers.filter(lm => lm.group_id !== groupId);
          
          // Preserve local members of this group that aren't in the remote data
          const remoteUserIds = data.map(item => item.user_id);
          const localUnsyncedMembers = localMembers.filter(lm => lm.group_id === groupId && !remoteUserIds.includes(lm.user_id));

          const newGroupMembers: GroupMember[] = data.map(item => ({
            id: Math.random().toString(36).substring(2, 15),
            group_id: groupId,
            user_id: item.user_id,
            joined_at: new Date().toISOString()
          }));
          await saveLocalData(KEYS.GROUP_MEMBERS, [...otherMembers, ...newGroupMembers, ...localUnsyncedMembers]);

          // Merge remote users with local unsynced users
          const localUnsyncedUserIds = localUnsyncedMembers.map(m => m.user_id);
          const localUnsyncedUsers = users.filter(u => localUnsyncedUserIds.includes(u.id));
          groupUsers = [...remoteUsers, ...localUnsyncedUsers];
        }
      } catch (e) {
        // Ignored
      }
    }

    return groupUsers;
  },

  // ==========================================
  // EXPENSES SERVICES
  // ==========================================
  async getGroupExpenses(groupId: string): Promise<Expense[]> {
    const expenses = await getLocalData<Expense>(KEYS.EXPENSES);
    let groupExpenses = expenses.filter(e => e.group_id === groupId);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('expenses')
          .select('*')
          .eq('group_id', groupId)
          .order('date', { ascending: false });

        if (data) {
          const others = expenses.filter(e => e.group_id !== groupId);
          // Preserve local expenses for this group that are not in remote data
          const remoteIds = data.map(re => re.id);
          const localUnsynced = expenses.filter(e => e.group_id === groupId && !remoteIds.includes(e.id));

          await saveLocalData(KEYS.EXPENSES, [...others, ...data, ...localUnsynced]);
          groupExpenses = [...data, ...localUnsynced] as Expense[];

          // Sync splits for this group's expenses
          if (data.length > 0) {
            try {
              const { data: splitsData } = await supabase
                .from('expense_splits')
                .select('*')
                .in('expense_id', data.map(e => e.id));
              if (splitsData) {
                const localSplits = await getLocalData<ExpenseSplit>(KEYS.EXPENSE_SPLITS);
                const otherSplits = localSplits.filter(s => !data.some(e => e.id === s.expense_id));
                await saveLocalData(KEYS.EXPENSE_SPLITS, [...otherSplits, ...splitsData]);
              }
            } catch (splitsErr) {
              console.error('Error syncing expense splits:', splitsErr);
            }
          }
        }
      } catch (e) { }
    }

    return groupExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async addExpense(
    expenseData: Omit<Expense, 'id' | 'created_at'>,
    splitsData: Omit<ExpenseSplit, 'id' | 'expense_id'>[]
  ): Promise<Expense> {
    const expenses = await getLocalData<Expense>(KEYS.EXPENSES);
    const splits = await getLocalData<ExpenseSplit>(KEYS.EXPENSE_SPLITS);

    const expenseId = Math.random().toString(36).substring(2, 15);
    const newExpense: Expense = {
      ...expenseData,
      id: expenseId,
      created_at: new Date().toISOString(),
    };

    const newSplits: ExpenseSplit[] = splitsData.map(split => ({
      ...split,
      id: Math.random().toString(36).substring(2, 15),
      expense_id: expenseId,
    }));

    expenses.push(newExpense);
    splits.push(...newSplits);

    await saveLocalData(KEYS.EXPENSES, expenses);
    await saveLocalData(KEYS.EXPENSE_SPLITS, splits);

    // Sync to Supabase in background (non-blocking)
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          const result = await supabase.from('expenses').insert({
            id: newExpense.id,
            group_id: newExpense.group_id,
            title: newExpense.title,
            amount: newExpense.amount,
            paid_by: newExpense.paid_by,
            category_id: newExpense.category_id,
            date: newExpense.date,
            notes: newExpense.notes,
            created_at: newExpense.created_at
          });

          console.log("SUPABASE INSERT EXPENSE RESULT", result);

          const supabaseSplits = newSplits.map(s => ({
            id: s.id,
            expense_id: s.expense_id,
            user_id: s.user_id,
            amount_owed: s.amount_owed,
            is_paid: s.is_paid
          }));

          await supabase.from('expense_splits').insert(supabaseSplits);
        } catch (error) {
          console.log(
            "SUPABASE EXPENSE ERROR FULL:",
            JSON.stringify(error, null, 2)
          );
        }
      })();
    }

    return newExpense;
  },

  // ==========================================
  // SETTLEMENTS SERVICES
  // ==========================================
  async getGroupSettlements(groupId: string): Promise<Settlement[]> {
    const settlements = await getLocalData<Settlement>(KEYS.SETTLEMENTS);
    let groupSettlements = settlements.filter(s => s.group_id === groupId);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('settlements')
          .select('*')
          .eq('group_id', groupId);

        if (data) {
          const others = settlements.filter(s => s.group_id !== groupId);
          // Preserve local settlements that are not in remote data
          const remoteIds = data.map(rs => rs.id);
          const localUnsynced = settlements.filter(s => s.group_id === groupId && !remoteIds.includes(s.id));

          await saveLocalData(KEYS.SETTLEMENTS, [...others, ...data, ...localUnsynced]);
          groupSettlements = [...data, ...localUnsynced] as Settlement[];
        }
      } catch (e) { }
    }

    return groupSettlements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async addSettlement(settlementData: Omit<Settlement, 'id'>): Promise<Settlement> {
    const settlements = await getLocalData<Settlement>(KEYS.SETTLEMENTS);
    const id = Math.random().toString(36).substring(2, 15);

    const newSettlement: Settlement = {
      ...settlementData,
      id,
    };

    settlements.push(newSettlement);
    await saveLocalData(KEYS.SETTLEMENTS, settlements);

    // Sync to Supabase in background (non-blocking)
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          await supabase.from('settlements').insert({
            id: newSettlement.id,
            group_id: newSettlement.group_id,
            paid_by: newSettlement.paid_by,
            paid_to: newSettlement.paid_to,
            amount: newSettlement.amount,
            date: newSettlement.date
          });
        } catch (error) {
          console.error('Supabase settlement sync failed:', error);
        }
      })();
    }

    return newSettlement;
  },

  // ==========================================
  // SPLITWISE BALANCE ENGINE (MILESTONE 7)
  // ==========================================
  async calculateBalances(groupId: string): Promise<{ balances: BalanceDetail[]; debts: Debt[] }> {
    const members = await this.getGroupMembers(groupId);
    const expenses = await this.getGroupExpenses(groupId);
    const settlements = await this.getGroupSettlements(groupId);
    const splits = await getLocalData<ExpenseSplit>(KEYS.EXPENSE_SPLITS);

    // Initialize balance map
    const netBalances: Record<string, number> = {};
    members.forEach((m) => {
      netBalances[m.id] = 0;
    });

    // 1. Process Expenses & Splits
    expenses.forEach((expense) => {
      // Payer gets credit
      if (netBalances[expense.paid_by] !== undefined) {
        netBalances[expense.paid_by] += Number(expense.amount);
      }

      // Filter splits for this expense
      const expenseSplits = splits.filter((s) => s.expense_id === expense.id);
      expenseSplits.forEach((split) => {
        if (netBalances[split.user_id] !== undefined) {
          netBalances[split.user_id] -= Number(split.amount_owed);
        }
      });
    });

    // 2. Process Settlements
    settlements.forEach((settlement) => {
      // Payer gets credit (reduces what they owe, or increases what they are owed)
      if (netBalances[settlement.paid_by] !== undefined) {
        netBalances[settlement.paid_by] += Number(settlement.amount);
      }
      // Recipient gets debited (reduces what they are owed, or increases what they owe)
      if (netBalances[settlement.paid_to] !== undefined) {
        netBalances[settlement.paid_to] -= Number(settlement.amount);
      }
    });

    // Map to list format
    const balances: BalanceDetail[] = members.map((m) => ({
      user_id: m.id,
      name: m.name,
      avatar: m.avatar,
      net_balance: Number((netBalances[m.id] || 0).toFixed(2)),
    }));

    // 3. Simplify Debts Algorithm (Minimize transactions)
    // Separate into creditors (positive net) and debtors (negative net)
    const creditors = balances
      .filter((b) => b.net_balance > 0.01)
      .map((b) => ({ ...b }))
      .sort((a, b) => b.net_balance - a.net_balance);

    const debtors = balances
      .filter((b) => b.net_balance < -0.01)
      .map((b) => ({ ...b, abs_balance: Math.abs(b.net_balance) }))
      .sort((a, b) => b.abs_balance - a.abs_balance);

    const debts: Debt[] = [];

    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < creditors.length && dIdx < debtors.length) {
      const creditor = creditors[cIdx];
      const debtor = debtors[dIdx];

      const settleAmount = Math.min(creditor.net_balance, debtor.abs_balance);

      debts.push({
        from: debtor.user_id,
        from_name: debtor.name,
        to: creditor.user_id,
        to_name: creditor.name,
        amount: Number(settleAmount.toFixed(2)),
      });

      // Update remaining amounts
      creditor.net_balance -= settleAmount;
      debtor.abs_balance -= settleAmount;

      if (creditor.net_balance < 0.01) {
        cIdx++;
      }
      if (debtor.abs_balance < 0.01) {
        dIdx++;
      }
    }

    return { balances, debts };
  },

  // ==========================================
  // SAVINGS SERVICES (MILESTONE 10)
  // ==========================================
  async getSavings(userId: string): Promise<Saving[]> {
    const savings = await getLocalData<Saving>(KEYS.SAVINGS);
    let userSavings = savings.filter(s => s.user_id === userId);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('savings')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false });

        if (data) {
          const others = savings.filter(s => s.user_id !== userId);
          // Preserve local savings that are not in remote data
          const remoteIds = data.map(rs => rs.id);
          const localUnsynced = savings.filter(s => s.user_id === userId && !remoteIds.includes(s.id));

          await saveLocalData(KEYS.SAVINGS, [...others, ...data, ...localUnsynced]);
          userSavings = [...data, ...localUnsynced] as Saving[];
        }
      } catch (e) { }
    }

    return userSavings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async addSaving(savingData: Omit<Saving, 'id'>): Promise<Saving> {
    const savings = await getLocalData<Saving>(KEYS.SAVINGS);
    const id = Math.random().toString(36).substring(2, 15);

    const newSaving: Saving = {
      ...savingData,
      id,
    };

    savings.push(newSaving);
    await saveLocalData(KEYS.SAVINGS, savings);

    // Sync to Supabase in background (non-blocking)
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          await supabase.from('savings').insert({
            id: newSaving.id,
            user_id: newSaving.user_id,
            title: newSaving.title,
            amount_saved: newSaving.amount_saved,
            category: newSaving.category,
            date: newSaving.date,
            note: newSaving.note
          });
        } catch (error) {
          console.error('Supabase saving sync failed:', error);
        }
      })();
    }

    return newSaving;
  },

  // ==========================================
  // BUDGETS SERVICES (MILESTONE 11)
  // ==========================================
  async getBudgets(userId: string): Promise<Budget[]> {
    const budgets = await getLocalData<Budget>(KEYS.BUDGETS);
    let userBudgets = budgets.filter(b => b.user_id === userId);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', userId);

        if (data) {
          const others = budgets.filter(b => b.user_id !== userId);
          // Preserve local budgets that are not in remote data
          const remoteIds = data.map(rb => rb.id);
          const localUnsynced = budgets.filter(b => b.user_id === userId && !remoteIds.includes(b.id));

          await saveLocalData(KEYS.BUDGETS, [...others, ...data, ...localUnsynced]);
          userBudgets = [...data, ...localUnsynced] as Budget[];
        }
      } catch (e) { }
    }

    return userBudgets;
  },

  async saveBudget(budgetData: Omit<Budget, 'id'>): Promise<Budget> {
    const budgets = await getLocalData<Budget>(KEYS.BUDGETS);

    // Check if category budget already exists for user
    const existingIdx = budgets.findIndex(
      (b) => b.user_id === budgetData.user_id && b.category === budgetData.category
    );

    let finalBudget: Budget;

    if (existingIdx >= 0) {
      // Update
      finalBudget = {
        ...budgets[existingIdx],
        monthly_limit: budgetData.monthly_limit,
      };
      budgets[existingIdx] = finalBudget;
    } else {
      // Create new
      const id = Math.random().toString(36).substring(2, 15);
      finalBudget = {
        ...budgetData,
        id,
      };
      budgets.push(finalBudget);
    }

    await saveLocalData(KEYS.BUDGETS, budgets);

    // Sync to Supabase in background (non-blocking)
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          await supabase.from('budgets').upsert({
            id: finalBudget.id,
            user_id: finalBudget.user_id,
            category: finalBudget.category,
            monthly_limit: finalBudget.monthly_limit
          });
        } catch (error) {
          console.error('Supabase budget sync failed:', error);
        }
      })();
    }

    return finalBudget;
  },

  // ==========================================
  // CUSTOM CATEGORIES
  // ==========================================
  async getCategories(): Promise<Category[]> {
    const customs = await getLocalData<Category>(KEYS.CUSTOM_CATEGORIES);
    return [...DEFAULT_CATEGORIES, ...customs];
  },
  async addCustomCategory(name: string, iconEmoji: string): Promise<Category> {
    const all = await this.getCategories();
    const existing = all.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;

    const customs = await getLocalData<Category>(KEYS.CUSTOM_CATEGORIES);
    const id = `custom_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Math.random().toString(36).substring(2, 5)}`;

    const newCategory: Category = {
      id,
      name,
      icon: iconEmoji,
      is_custom: true,
    };

    customs.push(newCategory);
    await saveLocalData(KEYS.CUSTOM_CATEGORIES, customs);

    // Sync to Supabase in background (non-blocking)
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          await supabase.from('categories').insert({
            id: newCategory.id,
            name: newCategory.name,
            icon: newCategory.icon
          });
        } catch (error) {
          console.error('Supabase custom category sync failed:', error);
        }
      })();
    }

    return newCategory;
  },

  // ==========================================
  // DELETE SERVICES
  // ==========================================
  async deleteExpense(expenseId: string): Promise<void> {
    const expenses = await getLocalData<Expense>(KEYS.EXPENSES);
    const splits = await getLocalData<ExpenseSplit>(KEYS.EXPENSE_SPLITS);

    const updatedExpenses = expenses.filter((e) => e.id !== expenseId);
    const updatedSplits = splits.filter((s) => s.expense_id !== expenseId);

    await saveLocalData(KEYS.EXPENSES, updatedExpenses);
    await saveLocalData(KEYS.EXPENSE_SPLITS, updatedSplits);

    // Sync to Supabase in background (non-blocking)
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          await supabase.from('expenses').delete().eq('id', expenseId);
        } catch (error) {
          console.error('Supabase expense delete failed:', error);
        }
      })();
    }
  },

  async deleteSettlement(settlementId: string): Promise<void> {
    const settlements = await getLocalData<Settlement>(KEYS.SETTLEMENTS);
    const updatedSettlements = settlements.filter((s) => s.id !== settlementId);

    await saveLocalData(KEYS.SETTLEMENTS, updatedSettlements);

    // Sync to Supabase in background (non-blocking)
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          await supabase.from('settlements').delete().eq('id', settlementId);
        } catch (error) {
          console.error('Supabase settlement delete failed:', error);
        }
      })();
    }
  },
};
