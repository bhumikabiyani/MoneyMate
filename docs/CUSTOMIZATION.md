# Code Customization Guide for MoneyMate

This guide provides instructions and pointers on how to adapt and customize the MoneyMate codebase to suit different use cases. Since MoneyMate is designed primarily as a lightweight partner/flatmate (2-person) expense tracker, expanding it to support **multi-person groups** or other custom features requires a few architectural adjustments.

---

## 1. Expanding to N-Person Expense Splitting

By default, the database schema (e.g. `group_members`, `expense_splits`, `settlements`) is already fully normalised and structured to support N-person splitting. However, the UI and local helper methods assume a **two-person limit**. 

To expand the application to support N-person groups (3 or more members):

### A. Modify Group Creation
Currently, when a shared group is created, `DBService.createGroup` automatically finds the first "other user" in local storage and adds them:
```typescript
const otherUser = users.find(u => u.id !== userId);
```
To support more members, modify the group creation interface:
1. In `src/screens/DashboardScreen.tsx` (the "Create Group" modal), add a user selection list so that creators can select multiple members from all registered users.
2. Update the `DBService.createGroup` signature to take an array of user IDs:
   ```typescript
   async createGroup(name: string, creatorId: string, memberIds: string[]): Promise<Group>
   ```
3. Loop through `memberIds` to create `GroupMember` mappings and sync them to Supabase.

### B. Generalise the Onboarding / User Creation
The onboarding screen currently creates exactly two profiles (the primary user and one partner).
- To allow adding more than two users, you can create a **"Members Manager"** screen inside the app where users can add additional friends/flatmates at any time.
- Use `DBService.createUser(name, avatar, deviceId)` to dynamically spawn new profiles.

### C. Update the Settle Screen Selector
In `src/screens/GroupScreen.tsx`, the settlement dialog pre-populates the payer and recipient using:
```typescript
setSettlePaidBy(members[0]?.id || '');
setSettlePaidTo(members[1]?.id || '');
```
For N-person groups:
1. Replace this logic with dropdown pickers (`Picker` or list modals) allowing selection of *any* member from the `members` array.
2. In `src/screens/SettleScreen.tsx`, verify that you can settle balances between any selected pair of members.

---

## 2. Changing Theme & Aesthetics

MoneyMate uses **NativeWind (TailwindCSS)** for styling. You can quickly customize colors, sizing, and spacing:

- **Tailwind Config**: Open [tailwind.config.js] to adjust the color palette. For example, changing the `primary` object colors will instantly update all buttons, checkboxes, and highlights throughout the app.
- **Global Styles**: Open [global.css] to add global custom utility classes.

---

## 3. Adding New Categories

To customize default categories:
1. Open [src/utils/constants.ts].
2. Modify or add entries in the `DEFAULT_CATEGORIES` list:
   ```typescript
   export const DEFAULT_CATEGORIES: Category[] = [
     { id: 'groceries', name: 'Groceries', icon: '🛒' },
     { id: 'subscriptions', name: 'Subscriptions', icon: '📺' }, // custom category
     ...
   ];
   ```
3. Update [src/database/schema.sql] under section `4. CATEGORIES TABLE` to match your changes, and run the schema query in your Supabase SQL editor so categories match in your backend database.

---

## 4. Customizing Android Widget UI

The home screen widgets are driven by `react-native-android-widget`.
- Layouts are defined using React Native components in [src/widgets/GroupBalanceWidget.tsx].
- Fallback/preview layouts are defined in XML inside [android/app/src/main/res/layout/widget_balance.xml]. 
- If you modify the visual look of the widget in the TypeScript file, remember to update the corresponding XML file so the preview matches the actual widget rendering.
