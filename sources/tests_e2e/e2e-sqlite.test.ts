import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { SQL } from "../main.ts";

const sql = SQL("sqlite");

function exec(db: Database, query: { sql: string; values: any[] }) {
	return db.prepare(query.sql).all(...query.values);
}

function run(db: Database, query: { sql: string; values: any[] }) {
	return db.prepare(query.sql).run(...query.values);
}

let db: Database;

beforeEach(() => {
	db = new Database(":memory:");
	db.run(`
		CREATE TABLE users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			email TEXT,
			age INTEGER,
			active INTEGER DEFAULT 1
		)
	`);
	db.run(`
		CREATE TABLE books (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			author TEXT,
			year INTEGER
		)
	`);
});

afterEach(() => {
	db.close();
});

describe("e2e sqlite — basic SELECT", () => {
	test("select with parameter returns correct row", () => {
		db.run(`INSERT INTO books (title, author, year) VALUES ('Dune', 'Frank Herbert', 1965)`);
		db.run(
			`INSERT INTO books (title, author, year) VALUES ('Neuromancer', 'William Gibson', 1984)`,
		);

		const q = sql`SELECT * FROM books WHERE id = ${1}`;
		const rows = exec(db, q);

		expect(rows).toHaveLength(1);
		expect((rows[0] as Record<string, unknown>).title).toBe("Dune");
	});

	test("select with multiple parameters", () => {
		db.run(`INSERT INTO books (title, author, year) VALUES ('Dune', 'Frank Herbert', 1965)`);
		db.run(
			`INSERT INTO books (title, author, year) VALUES ('Neuromancer', 'William Gibson', 1984)`,
		);

		const q = sql`SELECT * FROM books WHERE author = ${"William Gibson"} AND year = ${1984}`;
		const rows = exec(db, q);

		expect(rows).toHaveLength(1);
		expect((rows[0] as Record<string, unknown>).title).toBe("Neuromancer");
	});
});

describe("e2e sqlite — INSERT single row via sql(obj)", () => {
	test("inserts a row and can read it back", () => {
		const userData = { name: "Alice", email: "alice@example.com", age: 30 };
		const q = sql`INSERT INTO users ${sql(userData)}`;
		run(db, q);

		const rows = db.prepare("SELECT * FROM users WHERE name = ?").all("Alice");
		expect(rows).toHaveLength(1);
		const row = rows[0] as Record<string, unknown>;
		expect(row.email).toBe("alice@example.com");
		expect(row.age).toBe(30);
	});
});

describe("e2e sqlite — INSERT bulk rows via sql([obj, ...])", () => {
	test("inserts multiple rows at once", () => {
		const users = [
			{ name: "Alice", email: "alice@example.com", age: 30 },
			{ name: "Bob", email: "bob@example.com", age: 25 },
			{ name: "Carol", email: "carol@example.com", age: 35 },
		];
		const q = sql`INSERT INTO users ${sql(users)}`;
		run(db, q);

		const rows = db.prepare("SELECT * FROM users ORDER BY name").all();
		expect(rows).toHaveLength(3);
		expect((rows[0] as Record<string, unknown>).name).toBe("Alice");
		expect((rows[1] as Record<string, unknown>).name).toBe("Bob");
		expect((rows[2] as Record<string, unknown>).name).toBe("Carol");
	});
});

describe("e2e sqlite — UPDATE with sql(obj, ...keys)", () => {
	test("updates specific columns", () => {
		db.run(`INSERT INTO users (name, email, age) VALUES ('Alice', 'old@example.com', 25)`);

		const user = { name: "Alice Updated", email: "new@example.com", age: 26 };
		const q = sql`UPDATE users SET ${sql(user, "name", "email")} WHERE id = ${1}`;
		run(db, q);

		const rows = db.prepare("SELECT * FROM users WHERE id = 1").all();
		const row = rows[0] as Record<string, unknown>;
		expect(row.name).toBe("Alice Updated");
		expect(row.email).toBe("new@example.com");
		expect(row.age).toBe(25); // age unchanged
	});
});

describe("e2e sqlite — UPDATE with sql(obj) disambiguation", () => {
	test("context-sensitive SET disambiguation produces valid SQL", () => {
		db.run(`INSERT INTO users (name, email, age) VALUES ('Bob', 'bob@example.com', 40)`);

		const updates = { name: "Robert", email: "robert@example.com" };
		const q = sql`UPDATE users SET ${sql(updates)} WHERE id = ${1}`;
		run(db, q);

		const rows = db.prepare("SELECT * FROM users WHERE id = 1").all();
		const row = rows[0] as Record<string, unknown>;
		expect(row.name).toBe("Robert");
		expect(row.email).toBe("robert@example.com");
	});
});

describe("e2e sqlite — IN-list expansion", () => {
	test("select with IN clause on primitives", () => {
		db.run(`INSERT INTO books (title, author, year) VALUES ('Dune', 'Frank Herbert', 1965)`);
		db.run(
			`INSERT INTO books (title, author, year) VALUES ('Neuromancer', 'William Gibson', 1984)`,
		);
		db.run(
			`INSERT INTO books (title, author, year) VALUES ('Snow Crash', 'Neal Stephenson', 1992)`,
		);

		const q = sql`SELECT * FROM books WHERE id IN ${sql([1, 3])}`;
		const rows = exec(db, q);

		expect(rows).toHaveLength(2);
		const titles = (rows as Record<string, unknown>[]).map((r) => r.title);
		expect(titles).toContain("Dune");
		expect(titles).toContain("Snow Crash");
	});
});

describe("e2e sqlite — IN-list with object plucking", () => {
	test("plucks key from object array for IN clause", () => {
		db.run(`INSERT INTO users (name, email, age) VALUES ('Alice', 'a@x.com', 30)`);
		db.run(`INSERT INTO users (name, email, age) VALUES ('Bob', 'b@x.com', 25)`);
		db.run(`INSERT INTO users (name, email, age) VALUES ('Carol', 'c@x.com', 35)`);

		const targets = [{ id: 1 }, { id: 3 }];
		const q = sql`SELECT * FROM users WHERE id IN ${sql(targets, "id")}`;
		const rows = exec(db, q);

		expect(rows).toHaveLength(2);
		const names = (rows as Record<string, unknown>[]).map((r) => r.name);
		expect(names).toContain("Alice");
		expect(names).toContain("Carol");
	});
});

describe("e2e sqlite — safe identifiers", () => {
	test("sql('table_name') works as table identifier in query", () => {
		db.run(`INSERT INTO users (name, email, age) VALUES ('Alice', 'a@x.com', 30)`);

		const q = sql`SELECT * FROM ${sql("users")} WHERE id = ${1}`;
		const rows = exec(db, q);

		expect(rows).toHaveLength(1);
		expect((rows[0] as Record<string, unknown>).name).toBe("Alice");
	});
});

describe("e2e sqlite — nested fragments", () => {
	test("composed query with conditional fragment executes correctly", () => {
		db.run(`INSERT INTO users (name, email, age, active) VALUES ('Alice', 'a@x.com', 30, 1)`);
		db.run(`INSERT INTO users (name, email, age, active) VALUES ('Bob', 'b@x.com', 20, 1)`);
		db.run(`INSERT INTO users (name, email, age, active) VALUES ('Carol', 'c@x.com', 35, 0)`);

		const minAge = 25;
		const filterAge = true;
		const ageFilter = sql`AND age >= ${minAge}`;
		const q = sql`SELECT * FROM users WHERE active = ${1} ${filterAge ? ageFilter : sql``}`;
		const rows = exec(db, q);

		expect(rows).toHaveLength(1);
		expect((rows[0] as Record<string, unknown>).name).toBe("Alice");
	});

	test("skipped conditional fragment returns broader results", () => {
		db.run(`INSERT INTO users (name, email, age, active) VALUES ('Alice', 'a@x.com', 30, 1)`);
		db.run(`INSERT INTO users (name, email, age, active) VALUES ('Bob', 'b@x.com', 20, 1)`);
		db.run(`INSERT INTO users (name, email, age, active) VALUES ('Carol', 'c@x.com', 35, 0)`);

		const filterAge = false;
		const minAge = 25;
		const ageFilter = sql`AND age >= ${minAge}`;
		const q = sql`SELECT * FROM users WHERE active = ${1} ${filterAge ? ageFilter : sql``}`;
		const rows = exec(db, q);

		expect(rows).toHaveLength(2);
	});
});

describe("e2e sqlite — complex real-world workflow", () => {
	test("insert → update → select with multiple features", () => {
		// Step 1: Bulk insert
		const users = [
			{ name: "Alice", email: "alice@example.com", age: 30 },
			{ name: "Bob", email: "bob@example.com", age: 25 },
			{ name: "Carol", email: "carol@example.com", age: 35 },
		];
		run(db, sql`INSERT INTO ${sql("users")} ${sql(users)}`);

		// Step 2: Update one user
		const updates = { name: "Robert", email: "robert@example.com" };
		run(db, sql`UPDATE ${sql("users")} SET ${sql(updates)} WHERE id = ${2}`);

		// Step 3: Select with IN-list and conditional fragment
		const targetIds = [1, 2];
		const minAge = 20;
		const ageFilter = sql`AND age >= ${minAge}`;
		const q = sql`SELECT * FROM ${sql("users")} WHERE id IN ${sql(targetIds)} ${ageFilter} ORDER BY id`;
		const rows = exec(db, q);

		expect(rows).toHaveLength(2);
		const r0 = rows[0] as Record<string, unknown>;
		const r1 = rows[1] as Record<string, unknown>;
		expect(r0.name).toBe("Alice");
		expect(r1.name).toBe("Robert");
		expect(r1.email).toBe("robert@example.com");
	});
});
