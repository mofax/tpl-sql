# tpl-sql

A zero-dependency SQL template literal library that produces parameterized queries for **SQLite**, **PostgreSQL**, **MySQL**, and **Oracle**.

## Install

```bash
bun add tpl-sql
```

## Quick Start

```ts
import { SQL } from "tpl-sql";

const sql = SQL("postgres");

const id = 42;
const query = sql`SELECT * FROM books WHERE id = ${id}`;

query.sql; // "SELECT * FROM books WHERE id = $1"
query.values; // [42]
```

Every interpolated value becomes a bound parameter — no string concatenation, no SQL injection.

## Dialects

Choose your dialect when creating the sql function:

```ts
const sqlite = SQL("sqlite"); // ? placeholders
const mysql = SQL("mysql"); // ? placeholders
const pg = SQL("postgres"); // $1, $2, … placeholders
const oracle = SQL("oracle"); // :1, :2, … placeholders
```

| Dialect    | Placeholder style |
| ---------- | ----------------- |
| `sqlite`   | `?`               |
| `mysql`    | `?`               |
| `postgres` | `$1, $2, …`       |
| `oracle`   | `:1, :2, …`       |

## API

### Tagged Template — `` sql`...` ``

Interpolations become bound parameters:

```ts
const sql = SQL("postgres");
const q = sql`SELECT * FROM users WHERE name = ${"Alice"} AND age > ${21}`;
q.sql; // "SELECT * FROM users WHERE name = $1 AND age > $2"
q.values; // ["Alice", 21]
```

### Nested Fragments

Compose queries by nesting `` sql`...` `` expressions:

```ts
const where = sql`WHERE active = ${true}`;
const order = sql`ORDER BY name`;
const q = sql`SELECT * FROM users ${where} ${order}`;
q.sql; // "SELECT * FROM users WHERE active = ? ORDER BY name"
```

Conditional fragments:

```ts
const ageFilter = sql`AND age > ${minAge}`;
sql`SELECT * FROM users WHERE 1=1 ${filterAge ? ageFilter : sql``}`;
```

### Safe Identifiers — `sql("name")`

Inline table/column names with proper quoting. Only `[a-zA-Z0-9_.]` characters are allowed — anything else throws.

```ts
sql`SELECT * FROM ${sql("public.users")}`;
// SELECT * FROM "public"."users"
```

Identifiers do not consume a parameter slot.

### IN-List Expansion — `sql([...])`

Expand arrays into parameterized lists:

```ts
sql`SELECT * FROM users WHERE id IN ${sql([1, 2, 3])}`;
// SELECT * FROM users WHERE id IN (?, ?, ?)
// values: [1, 2, 3]
```

Pluck a key from an array of objects:

```ts
const users = [
	{ id: 1, name: "Alice" },
	{ id: 2, name: "Bob" },
];
sql`SELECT * FROM users WHERE id IN ${sql(users, "id")}`;
// values: [1, 2]
```

### Insert Helper — `sql(obj)` / `sql([obj, ...])`

Single row:

```ts
const data = { name: "Alice", email: "alice@example.com" };
const q = sql`INSERT INTO users ${sql(data)} RETURNING *`;
q.sql; // 'INSERT INTO users ("name", "email") VALUES (?, ?) RETURNING *'
```

Bulk insert:

```ts
const rows = [
	{ name: "Alice", email: "alice@example.com" },
	{ name: "Bob", email: "bob@example.com" },
];
const q = sql`INSERT INTO users ${sql(rows)}`;
q.sql; // 'INSERT INTO users ("name", "email") VALUES (?, ?), (?, ?)'
```

### Update Helper — `sql(obj, ...keys)`

All columns:

```ts
const user = { name: "Alice", email: "alice@example.com" };
sql`UPDATE users SET ${sql(user)} WHERE id = ${1}`;
// UPDATE users SET "name" = ?, "email" = ? WHERE id = ?
```

Specific columns:

```ts
const user = { id: 1, name: "Alice", email: "alice@example.com" };
sql`UPDATE users SET ${sql(user, "name", "email")} WHERE id = ${user.id}`;
// UPDATE users SET "name" = ?, "email" = ? WHERE id = ?
```

## Context-Sensitive Disambiguation

When `sql(obj)` is called with a plain object and no extra keys, the preceding SQL text is inspected:

| Preceding SQL ends with | Behavior                      |
| ----------------------- | ----------------------------- |
| `INSERT INTO ...`       | Generates `(cols) VALUES (?)` |
| `SET`                   | Generates `"col" = ?, ...`    |

## Development

```bash
bun install
bun test
```

## License

MIT
