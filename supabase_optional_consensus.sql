create table if not exists consensus_babies (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  prediction_count int,
  created_at timestamptz default now()
);

create index if not exists consensus_babies_created_at_idx
on consensus_babies (created_at desc);
