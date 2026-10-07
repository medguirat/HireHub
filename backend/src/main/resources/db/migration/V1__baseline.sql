-- HireHub schema, version 1: the schema as it was when Flyway was introduced (generated from the
-- JPA entities, the same as Hibernate's ddl-auto created). Constraint names are Hibernate's, so a
-- database created by this script and an existing one marked as version 1 (baseline) are identical.
-- Never edit an applied migration: add a new V<n>__<description>.sql instead.

create table application_evaluations (
    id bigint not null auto_increment,
    available_now bit not null,
    communication integer not null,
    cultural_fit integer not null,
    experience integer not null,
    has_degree bit not null,
    passed_test bit not null,
    score float(53) not null,
    technical_skills integer not null,
    application_id bigint not null,
    evaluated_by_id bigint,
    updated_at datetime(6),
    notes TEXT,
    interview_type enum ('ONSITE','REMOTE'),
    primary key (id)
) engine=InnoDB default charset=utf8mb4;

create table applications (
    id bigint not null auto_increment,
    application_date date,
    candidate_id bigint not null,
    interview_date datetime(6),
    job_offer_id bigint not null,
    cover_letter_file_id varchar(36),
    cv_file_id varchar(36),
    cover_letter TEXT,
    cv varchar(255) not null,
    interview_letter TEXT,
    status enum ('ACCEPTED','PENDING','REJECTED'),
    primary key (id)
) engine=InnoDB default charset=utf8mb4;

create table candidate_cv_documents (
    id bigint not null auto_increment,
    candidate_id bigint not null,
    size_bytes bigint not null,
    uploaded_at datetime(6) not null,
    sha256 varchar(64) not null,
    content_type varchar(255),
    extracted_text LONGTEXT,
    original_file_name varchar(255) not null,
    stored_file_name varchar(255) not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4;

create table candidate_languages (
    position integer not null,
    candidate_profile_id bigint not null,
    language varchar(60) not null,
    level enum ('BASIC','FLUENT','INTERMEDIATE','NATIVE','PROFESSIONAL') not null,
    primary key (position, candidate_profile_id)
) engine=InnoDB default charset=utf8mb4;

create table candidate_profiles (
    user_id bigint not null,
    headline varchar(150),
    education varchar(1000),
    bio TEXT,
    picture varchar(255),
    url_github varchar(255),
    url_linkedin varchar(255),
    url_portfolio varchar(255),
    primary key (user_id)
) engine=InnoDB default charset=utf8mb4;

create table candidate_skills (
    candidate_profile_id bigint not null,
    skill varchar(255)
) engine=InnoDB default charset=utf8mb4;

create table experiences (
    id bigint not null auto_increment,
    end_date date,
    start_date date not null,
    candidate_profile_id bigint not null,
    company varchar(255) not null,
    position varchar(255) not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4;

create table job_offers (
    id bigint not null auto_increment,
    deadline date,
    publication_date date,
    closed_at datetime(6),
    published_at datetime(6),
    recruiter_id bigint not null,
    description TEXT,
    location varchar(255) not null,
    title varchar(255) not null,
    contract_type enum ('CDD','CDI','FREELANCE','STAGE'),
    status enum ('CLOSED','OPEN') default 'OPEN' not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4;

create table match_scores (
    id bigint not null auto_increment,
    overall_score integer not null,
    candidate_id bigint not null,
    computed_at datetime(6) not null,
    job_offer_id bigint not null,
    algorithm_version varchar(40) not null,
    cv_sha256 varchar(64) not null,
    offer_fingerprint varchar(64) not null,
    result_json LONGTEXT not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4;

create table notifications (
    id bigint not null auto_increment,
    is_read bit not null,
    application_id bigint,
    created_at datetime(6),
    user_id bigint not null,
    message varchar(2000) not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4;

create table password_reset_tokens (
    id bigint not null auto_increment,
    created_at datetime(6) not null,
    expires_at datetime(6) not null,
    used_at datetime(6),
    user_id bigint not null,
    token_hash varchar(64) not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4;

create table recruiter_profiles (
    user_id bigint not null,
    founded_year integer,
    company_import_updated_at datetime(6),
    auto_filled_fields varchar(500),
    company_import_message varchar(500),
    offices varchar(2000),
    company_values varchar(3000),
    mission varchar(3000),
    vision varchar(3000),
    company_name varchar(255),
    company_size varchar(255),
    company_type varchar(255),
    description TEXT,
    facebook varchar(255),
    google_maps_url varchar(255),
    headquarters varchar(255),
    industry varchar(255),
    instagram varchar(255),
    linkedin varchar(255),
    logo varchar(255),
    phone varchar(255),
    technologies varchar(255),
    twitter varchar(255),
    website varchar(255),
    company_import_status enum ('COMPLETED','FAILED','IN_PROGRESS','NOT_REQUESTED') default 'NOT_REQUESTED' not null,
    primary key (user_id)
) engine=InnoDB default charset=utf8mb4;

create table stored_files (
    id varchar(36) not null,
    created_at datetime(6) not null,
    owner_id bigint not null,
    size_bytes bigint not null,
    content_type varchar(255) not null,
    original_name varchar(255) not null,
    stored_name varchar(255) not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4;

create table users (
    id bigint not null auto_increment,
    credentials_changed_at datetime(6),
    email varchar(255) not null,
    first_name varchar(255) not null,
    last_name varchar(255) not null,
    password varchar(255) not null,
    role enum ('CANDIDATE','RECRUITER') not null,
    primary key (id)
) engine=InnoDB default charset=utf8mb4;

alter table application_evaluations
    add constraint UK49degavp4514v3nmca1gwgn9q unique (application_id);

alter table candidate_cv_documents
    add constraint UK2tlitxolphehcjy7x94x8lntp unique (candidate_id);

alter table match_scores
    add constraint UKi3wj1wejlnw21f287w0hs6ypk unique (candidate_id, job_offer_id);

alter table password_reset_tokens
    add constraint UKajre85ybxavf1tt4omkrs5p6g unique (token_hash);

alter table users
    add constraint UK6dotkott2kjsp8vw4d0m25fb7 unique (email);

alter table application_evaluations
    add constraint FK1yqjmwiewidr686v4q50mg1be
    foreign key (application_id)
    references applications (id)
    on delete cascade;

alter table application_evaluations
    add constraint FKf42re5g1mo6nbt9wnkubuw4po
    foreign key (evaluated_by_id)
    references users (id)
    on delete cascade;

alter table applications
    add constraint FK32iahkg1fqci0pt76uql80nj7
    foreign key (candidate_id)
    references users (id);

alter table applications
    add constraint FKeo9iu6541pu3q76228tepmodc
    foreign key (cover_letter_file_id)
    references stored_files (id);

alter table applications
    add constraint FKb54v5ulhxw9kbt282kmsdp3e0
    foreign key (cv_file_id)
    references stored_files (id);

alter table applications
    add constraint FKawuu01ou28l0903avu0nwx058
    foreign key (job_offer_id)
    references job_offers (id);

alter table candidate_cv_documents
    add constraint FK9ncbx9q1xajvwlq2wcihfdykv
    foreign key (candidate_id)
    references users (id)
    on delete cascade;

alter table candidate_languages
    add constraint FK9p75p6oye0kbpkwvyfg6dv20c
    foreign key (candidate_profile_id)
    references candidate_profiles (user_id);

alter table candidate_profiles
    add constraint FKn7b2se0y378uox9e3aw2bjg13
    foreign key (user_id)
    references users (id);

alter table candidate_skills
    add constraint FKth710w3978vqyonpto6hwyper
    foreign key (candidate_profile_id)
    references candidate_profiles (user_id);

alter table experiences
    add constraint FKh80tdvkwhudjd432bhex1qhci
    foreign key (candidate_profile_id)
    references candidate_profiles (user_id);

alter table job_offers
    add constraint FKnqarts4oog62ueq8q11iu24u3
    foreign key (recruiter_id)
    references users (id);

alter table match_scores
    add constraint FK7835ykc0w8d8i5x4hhgek8vu6
    foreign key (candidate_id)
    references users (id)
    on delete cascade;

alter table match_scores
    add constraint FK41627l8uuqcxdajk8e4bkrv7n
    foreign key (job_offer_id)
    references job_offers (id)
    on delete cascade;

alter table notifications
    add constraint FK3xxmp2l47bw7mg7ceg1jhxrhy
    foreign key (application_id)
    references applications (id);

alter table notifications
    add constraint FK9y21adhxn0ayjhfocscqox7bh
    foreign key (user_id)
    references users (id);

alter table password_reset_tokens
    add constraint FKk3ndxg5xp6v7wd4gjyusp15gq
    foreign key (user_id)
    references users (id)
    on delete cascade;

alter table recruiter_profiles
    add constraint FKptvsvv96hvn5sjrauymiew6gy
    foreign key (user_id)
    references users (id);

alter table stored_files
    add constraint FKfn1el0gw3hs74iw4ktmlgjc6x
    foreign key (owner_id)
    references users (id)
    on delete cascade;
