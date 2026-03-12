import { describe, expect, test } from "bun:test";
import { SQL } from "../main.ts";

describe("insert helper", () => {
	const sql = SQL("sqlite");

	test("single object insert", () => {
		const userData = { name: "Alice", email: "alice@example.com" };
		const q = sql`INSERT INTO users ${sql(userData)}`;
		expect(q.sql).toBe(`INSERT INTO users ("name", "email") VALUES (?, ?)`);
		expect(q.values).toEqual(["Alice", "alice@example.com"]);
	});

	test("single object insert (postgres)", () => {
		const pg = SQL("postgres");
		const userData = { name: "Alice", email: "alice@example.com" };
		const q = pg`INSERT INTO users ${pg(userData)}`;
		expect(q.sql).toBe(`INSERT INTO users ("name", "email") VALUES ($1, $2)`);
		expect(q.values).toEqual(["Alice", "alice@example.com"]);
	});

	test("single object insert with RETURNING", () => {
		const userData = { name: "Alice", email: "alice@example.com" };
		const q = sql`INSERT INTO users ${sql(userData)} RETURNING *`;
		expect(q.sql).toBe(`INSERT INTO users ("name", "email") VALUES (?, ?) RETURNING *`);
		expect(q.values).toEqual(["Alice", "alice@example.com"]);
	});

	test("bulk insert with array of objects", () => {
		const users = [
			{ name: "Alice", email: "alice@example.com" },
			{ name: "Bob", email: "bob@example.com" },
			{ name: "Charlie", email: "charlie@example.com" },
		];
		const q = sql`INSERT INTO users ${sql(users)}`;
		expect(q.sql).toBe(`INSERT INTO users ("name", "email") VALUES (?, ?), (?, ?), (?, ?)`);
		expect(q.values).toEqual([
			"Alice",
			"alice@example.com",
			"Bob",
			"bob@example.com",
			"Charlie",
			"charlie@example.com",
		]);
	});

	test("bulk insert with array of objects (postgres)", () => {
		const pg = SQL("postgres");
		const users = [
			{ name: "Alice", email: "alice@example.com" },
			{ name: "Bob", email: "bob@example.com" },
		];
		const q = pg`INSERT INTO users ${pg(users)}`;
		expect(q.sql).toBe(`INSERT INTO users ("name", "email") VALUES ($1, $2), ($3, $4)`);
	});

	test("single-row bulk insert (array with one object)", () => {
		const users = [{ name: "Alice", email: "alice@example.com" }];
		const q = sql`INSERT INTO users ${sql(users)}`;
		expect(q.sql).toBe(`INSERT INTO users ("name", "email") VALUES (?, ?)`);
		expect(q.values).toEqual(["Alice", "alice@example.com"]);
	});

	test("insert with null values", () => {
		const data = { name: "Alice", email: null };
		const q = sql`INSERT INTO users ${sql(data)}`;
		expect(q.sql).toBe(`INSERT INTO users ("name", "email") VALUES (?, ?)`);
		expect(q.values).toEqual(["Alice", null]);
	});

	test("throws on empty object insert", () => {
		expect(() => sql`INSERT INTO users ${sql({})}`).toThrow();
	});

	test("throws on empty array insert", () => {
		expect(() => sql`INSERT INTO users ${sql([])}`).toThrow();
	});
});
