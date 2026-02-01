-- Executable version of the provided schema (ordered for FK dependencies)

CREATE TABLE public.ref_role (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL UNIQUE,
  CONSTRAINT ref_role_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ref_unit (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  image_url character varying,
  CONSTRAINT ref_unit_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ref_diet_info (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL UNIQUE,
  image_url character varying,
  CONSTRAINT ref_diet_info_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ref_difficulty (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  image_url character varying,
  CONSTRAINT ref_difficulty_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ref_recipe_category (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL UNIQUE,
  image_url character varying,
  CONSTRAINT ref_recipe_category_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ref_cuisine (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  image_url text UNIQUE,
  CONSTRAINT ref_cuisine_pkey PRIMARY KEY (id)
);

CREATE TABLE public.tag (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL UNIQUE,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone NOT NULL,
  CONSTRAINT tag_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  username character varying NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  city character varying,
  state character varying,
  country character varying,
  is_active boolean NOT NULL DEFAULT true,
  last_login timestamp with time zone,
  timezone text,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone NOT NULL,
  CONSTRAINT user_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ingredient (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  canonical_name character varying NOT NULL,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone NOT NULL,
  CONSTRAINT ingredient_pkey PRIMARY KEY (id)
);

CREATE TABLE public.recipe (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id integer NOT NULL,
  name character varying,
  description text CHECK (length(description) <= 150),
  prep_time integer,
  cook_time integer,
  servings integer,
  image_url character varying,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone NOT NULL,
  is_public boolean DEFAULT false,
  ref_cuisine_id integer,
  ref_difficulty_id integer,
  ref_recipe_category_id integer,
  CONSTRAINT recipe_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_difficulty_id_fkey FOREIGN KEY (ref_difficulty_id) REFERENCES public.ref_difficulty(id),
  CONSTRAINT recipe_ref_recipe_category_id_fkey FOREIGN KEY (ref_recipe_category_id) REFERENCES public.ref_recipe_category(id),
  CONSTRAINT recipe_ref_cuisine_id_fkey FOREIGN KEY (ref_cuisine_id) REFERENCES public.ref_cuisine(id),
  CONSTRAINT recipe_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(id)
);

CREATE TABLE public.recipe_instruction (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  recipe_id integer NOT NULL,
  position integer NOT NULL CHECK ("position" > 0),
  description text NOT NULL,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone NOT NULL,
  CONSTRAINT recipe_instruction_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_direction_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);

CREATE TABLE public.recipe_ingredient (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  recipe_id integer NOT NULL,
  ingredient_id integer NOT NULL,
  name character varying,
  ref_unit_id integer,
  quantity integer,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone NOT NULL,
  CONSTRAINT recipe_ingredient_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_ingredient_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredient(id),
  CONSTRAINT recipe_ingredient_ref_unit_id_fkey FOREIGN KEY (ref_unit_id) REFERENCES public.ref_unit(id),
  CONSTRAINT recipe_ingredient_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);

CREATE TABLE public.recipe_diet_info (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  recipe_id integer NOT NULL,
  ref_diet_info_id integer NOT NULL,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone NOT NULL,
  CONSTRAINT recipe_diet_info_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_diet_info_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id),
  CONSTRAINT recipe_diet_info_ref_diet_info_id_fkey FOREIGN KEY (ref_diet_info_id) REFERENCES public.ref_diet_info(id)
);

CREATE TABLE public.recipe_tag (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  recipe_id integer NOT NULL,
  tag_id integer NOT NULL,
  CONSTRAINT recipe_tag_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_tag_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id),
  CONSTRAINT recipe_tag_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tag(id)
);

CREATE TABLE public.user_role (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id integer NOT NULL,
  ref_role_id integer NOT NULL,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone NOT NULL,
  CONSTRAINT user_role_pkey PRIMARY KEY (id),
  CONSTRAINT user_role_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(id),
  CONSTRAINT user_role_ref_role_id_fkey FOREIGN KEY (ref_role_id) REFERENCES public.ref_role(id)
);
