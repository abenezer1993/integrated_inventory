# Inventory Management System

A modern React web application with Supabase for managing company materials, inventory distribution, and sales.

## Features

- **Material Management**: Add and manage both manufactured and purchased materials
- **Inventory Management**: Central and branch inventory tracking with low stock alerts
- **Sales Management**: Record and track sales across all branches
- **Dashboard**: Real-time analytics and reporting
- **Authentication**: Secure user login system
- **Responsive Design**: Modern UI with TailwindCSS

## Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Routing**: React Router
- **UI Components**: Headless UI, Heroicons

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Supabase:
   - Create a new Supabase project
   - Run the SQL from `database.sql` in your Supabase SQL editor
   - Copy your Supabase URL and anon key

4. Create environment file:
   ```bash
   cp .env.example .env
   ```
   Add your Supabase credentials to `.env`:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url_here
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

5. Start the development server:
   ```bash
   npm start
   ```

## Database Schema

The system includes the following main tables:
- **branches**: Store locations
- **materials**: Product catalog (manufactured vs purchased)
- **inventory**: Stock levels per branch
- **sales**: Sales transactions
- **inventory_movements**: Stock transfer history

## Usage

1. Login to the system
2. Add materials to your catalog
3. Manage inventory across branches
4. Record sales transactions
5. Monitor dashboard for insights

## Key Features

### Material Types
- **Manufactured**: Produced in-house by the company
- **Purchased**: Bought from external suppliers

### Inventory Distribution
- Central warehouse management
- Multiple branch locations
- Stock transfer capabilities
- Low stock notifications

### Sales Tracking
- Per-branch sales recording
- Customer information
- Revenue analytics
- Sales history

### Dashboard Analytics
- Total materials count
- Inventory levels
- Sales revenue
- Low stock alerts
- Recent activities
