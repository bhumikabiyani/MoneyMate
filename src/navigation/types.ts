export type RootStackParamList = {
  Welcome: undefined;
  MainTabs: undefined;
  GroupDetails: { groupId: string };
  Settle: { groupId: string; defaultDebtorId?: string; defaultCreditorId?: string; defaultAmount?: number };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Analytics: undefined;
  SavedInsteadTab: undefined; // renamed slightly to distinguish if needed
  Budgets: undefined;
  History: undefined;
};
