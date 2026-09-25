\# TrustForge Development Rules



\## Project

TrustForge is a self-hosted hackathon submission and judging platform focused on trustworthy and explainable judging.



\## Stack



Backend:

\- Java 25

\- Spring Boot

\- Spring Security

\- Spring Data JPA

\- Hibernate

\- PostgreSQL

\- Redis

\- Flyway

\- Maven



Frontend:

\- React

\- Vite

\- JavaScript

\- HTML

\- CSS



Infrastructure:

\- Docker

\- Docker Compose



Testing:

\- JUnit 5

\- Mockito

\- Testcontainers



\## Architecture

Use a modular monolith.



Do not introduce microservices, Kafka, Kubernetes, Elasticsearch, cloud-only services, or external runtime APIs unless explicitly required.



\## Core Requirements

\- docker compose up must start the entire application

\- application must seed deterministic fixture data

\- application must work without network connectivity at runtime

\- use local PostgreSQL

\- use local Redis

\- enforce authorization on the backend

\- never rely on frontend-only permission checks

\- enforce submission deadlines server-side

\- judges can only access assigned projects

\- locked evaluations cannot be modified

\- users cannot access data outside their role



\## Quality Rules

\- keep controllers thin

\- business logic belongs in services

\- use DTOs

\- validate inputs

\- use transactions where required

\- write tests for security-sensitive logic

\- do not fake implementations

\- do not leave TODO placeholders for required functionality

\- do not claim a feature is complete until it is tested



\## Main Modules

auth

users

events

teams

projects

submissions

judges

assignments

rubrics

evaluations

normalization

pairrank

anomaly

audit

voting

results

exports



\## Product Differentiators

1\. Intelligent judge assignment

2\. Score normalization

3\. Pairwise ranking

4\. Evaluation anomaly detection

5\. Tamper-evident audit chain

6\. Ranking stability analysis

7\. Explainable Trust Report

8\. What-if ranking simulation



\## Development Process

Implement one phase at a time.



After every phase:

1\. compile

2\. run tests

3\. fix failures

4\. verify functionality

5\. report remaining issues honestly



Never proceed while known critical tests are failing.

