# Supabase Database Setup for MoneyMate

This guide explains how to set up a self-hosted or managed Supabase database to back your MoneyMate installation.

## 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign in.
2. Click **New Project** and select your organization.
3. Choose a project name, database password, and region.
4. Wait for the database services to provision.

## 2. Execute the Database Schema

1. Once the project is ready, navigate to the **SQL Editor** from the left-hand sidebar menu in the Supabase console.
2. Click **New Query** to create a fresh SQL script editor.
3. Open the file `src/database/schema.sql` located inside the MoneyMate project repository.
4. Copy the entire contents of `schema.sql` and paste it into the Supabase SQL editor.
5. Click the **Run** button to execute the script. This will create all the necessary tables, indexes, and insert the default category records.

## 3. Set Up Environment Variables

To connect your React Native application to Supabase, you must configure the environment variables:

1. In the Supabase console, go to **Project Settings** -> **API**.
2. Find the **Project URL** and the **anon (public) API Key**.
3. Create a `.env` file in the root directory of your cloned MoneyMate repository (you can copy the format from `.env.example`).
4. Add the retrieved values to your `.env` file:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_key
   ```

> [!WARNING]
> Do NOT commit your `.env` file to public version control systems. The `.gitignore` file is pre-configured to ignore `.env` files to prevent credential leakage.

## 4. Security Note

MoneyMate is designed to be a **self-hosted, private personal finance app**. 
- To keep the installation as simple and friction-free as possible, **authentication is intentionally omitted** (the app uses device-based onboarding and local identification).
- Access control relies entirely on the privacy of your Supabase project credentials. Ensure your project's anon key and database password are kept secure and never exposed publicly.
