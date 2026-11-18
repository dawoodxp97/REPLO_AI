create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role text not null default 'member'
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users (id),
  title text not null
);
