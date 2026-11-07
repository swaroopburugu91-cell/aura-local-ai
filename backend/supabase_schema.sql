-- ==============================================================================
-- AURA LOCAL AI - SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Run this in your Supabase Project -> SQL Editor to create backend tables
-- ==============================================================================

-- 1. Enable UUID and Vector extensions (for RAG vector search in Postgres)
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- 2. Conversations Table
create table if not exists public.conversations (
    id text primary key,
    title text not null default 'New Chat',
    model text not null default 'llama3.2:3b',
    system_prompt text default '',
    pinned boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Messages Table
create table if not exists public.messages (
    id text primary key,
    conversation_id text not null references public.conversations(id) on delete cascade,
    role text not null,
    content text not null,
    tokens integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Documents Knowledge Base Table
create table if not exists public.documents (
    id text primary key,
    filename text not null,
    file_type text not null,
    file_size integer not null default 0,
    chunk_count integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Document Chunks (RAG with pgvector)
create table if not exists public.document_chunks (
    id text primary key,
    document_id text not null references public.documents(id) on delete cascade,
    chunk_index integer not null,
    text text not null,
    embedding vector(384) -- optional for 384-dim local sentence embeddings
);

-- 6. User Settings Table
create table if not exists public.user_settings (
    key text primary key,
    value text not null
);

-- Enable Row Level Security (RLS) - Set public access for local desktop client
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.user_settings enable row level security;

-- Policies allowing authenticated / anon keys from desktop client
create policy "Allow all operations for public client" on public.conversations for all using (true) with check (true);
create policy "Allow all operations for public client" on public.messages for all using (true) with check (true);
create policy "Allow all operations for public client" on public.documents for all using (true) with check (true);
create policy "Allow all operations for public client" on public.document_chunks for all using (true) with check (true);
create policy "Allow all operations for public client" on public.user_settings for all using (true) with check (true);
