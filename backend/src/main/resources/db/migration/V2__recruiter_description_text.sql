-- The company description became TEXT (up to 5000 characters, checked by the API). Databases created
-- before that by Hibernate's ddl-auto=update kept VARCHAR(255), since "update" never changes an
-- existing column. Harmless where the column is already TEXT.
alter table recruiter_profiles modify description TEXT null;
