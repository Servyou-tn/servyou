
-- JOB POSTS: a consumer describes a need; freelancers respond.
create table public.job_posts (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  budget_min numeric(10,2) check (budget_min >= 0),
  budget_max numeric(10,2) check (budget_max >= 0),
  category_id uuid references public.categories(id) on delete set null,
  city text,
  is_remote boolean not null default false,
  deadline date,
  status text not null default 'open' check (status in ('open','filled','expired','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index job_posts_consumer_idx on public.job_posts(consumer_id);
create index job_posts_category_idx on public.job_posts(category_id);
create index job_posts_status_idx on public.job_posts(status);
create trigger job_posts_set_updated_at before update on public.job_posts
  for each row execute function public.handle_updated_at();

-- Skills wanted on a post (for filtering the board).
create table public.job_post_skills (
  id uuid primary key default gen_random_uuid(),
  job_post_id uuid not null references public.job_posts(id) on delete cascade,
  skill text not null,
  created_at timestamptz not null default now()
);
create index job_post_skills_post_idx on public.job_post_skills(job_post_id);

-- Freelancer responses with a short proposal message.
create table public.job_responses (
  id uuid primary key default gen_random_uuid(),
  job_post_id uuid not null references public.job_posts(id) on delete cascade,
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  proposal_message text,
  created_at timestamptz not null default now(),
  unique (job_post_id, freelancer_id)
);
create index job_responses_post_idx on public.job_responses(job_post_id);
create index job_responses_freelancer_idx on public.job_responses(freelancer_id);

-- ===== Row Level Security =====
alter table public.job_posts enable row level security;
alter table public.job_post_skills enable row level security;
alter table public.job_responses enable row level security;

-- Job posts: open posts readable by anyone; the poster also sees their own (any status). Only poster manages.
create policy "Open posts or own posts readable" on public.job_posts for select
  using (status = 'open' or consumer_id = auth.uid());
create policy "Consumer creates own post" on public.job_posts for insert
  with check (consumer_id = auth.uid());
create policy "Consumer updates own post" on public.job_posts for update
  using (consumer_id = auth.uid()) with check (consumer_id = auth.uid());
create policy "Consumer deletes own post" on public.job_posts for delete
  using (consumer_id = auth.uid());

-- Job post skills: readable by anyone (to filter); managed by the post owner.
create policy "Post skills viewable by everyone" on public.job_post_skills for select using (true);
create policy "Post owner inserts skills" on public.job_post_skills for insert
  with check (exists (select 1 from public.job_posts jp where jp.id = job_post_id and jp.consumer_id = auth.uid()));
create policy "Post owner deletes skills" on public.job_post_skills for delete
  using (exists (select 1 from public.job_posts jp where jp.id = job_post_id and jp.consumer_id = auth.uid()));

-- Job responses: readable by the post owner and the responding freelancer; freelancer creates own.
create policy "Post owner and responder read responses" on public.job_responses for select
  using (
    freelancer_id = auth.uid()
    or exists (select 1 from public.job_posts jp where jp.id = job_post_id and jp.consumer_id = auth.uid())
  );
create policy "Freelancer creates own response" on public.job_responses for insert
  with check (freelancer_id = auth.uid());
create policy "Freelancer deletes own response" on public.job_responses for delete
  using (freelancer_id = auth.uid());
