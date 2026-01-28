-- Basic schema for current GraphQL usage (users + recipes + lookup refs)

CREATE TABLE IF NOT EXISTS public.user (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    city TEXT,
    state TEXT,
    country TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    timezone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ref_difficulty (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.ref_recipe_category (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.ref_cuisine (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.recipe (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.user(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    prep_time INTEGER,
    cook_time INTEGER,
    servings INTEGER,
    ref_recipe_category_id INTEGER REFERENCES public.ref_recipe_category(id),
    ref_cuisine_id INTEGER REFERENCES public.ref_cuisine(id),
    ref_difficulty_id INTEGER REFERENCES public.ref_difficulty(id),
    image_url TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ingredient (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES public.recipe(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT,
    quantity INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.instruction (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES public.recipe(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
