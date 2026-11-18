create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_cents integer not null,
  stock integer not null default 0
);

create table orders (
  id uuid primary key,
  lines jsonb not null,
  total_cents integer not null,
  status text not null
);
