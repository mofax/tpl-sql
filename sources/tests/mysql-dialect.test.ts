import { describe, expect, test } from "bun:test";
import { SQL } from "../main.ts";

describe("mysql dialect", () => {
	const sql = SQL("mysql");

	test("single parameter", () => {
		const q = sql`SELECT * FROM books WHERE id = ${42}`;
		expect(q.sql).toBe("SELECT * FROM books WHERE id = ?");
		expect(q.values).toEqual([42]);
	});

	test("multiple parameters", () => {
		const q = sql`SELECT * FROM books WHERE id = ${1} AND title = ${"Dune"}`;
		expect(q.sql).toBe("SELECT * FROM books WHERE id = ? AND title = ?");
		expect(q.values).toEqual([1, "Dune"]);
	});

	test("IN-list expansion", () => {
		const q = sql`SELECT * FROM users WHERE id IN ${sql([1, 2, 3])}`;
		expect(q.sql).toBe("SELECT * FROM users WHERE id IN (?, ?, ?)");
		expect(q.values).toEqual([1, 2, 3]);
	});

	test("single object insert", () => {
		const data = { name: "Alice", email: "alice@example.com" };
		const q = sql`INSERT INTO users ${sql(data)}`;
		expect(q.sql).toBe(`INSERT INTO users ("name", "email") VALUES (?, ?)`);
		expect(q.values).toEqual(["Alice", "alice@example.com"]);
	});

	test("update with specific columns", () => {
		const user = { id: 1, name: "Alice", email: "alice@example.com" };
		const q = sql`UPDATE users SET ${sql(user, "name", "email")} WHERE id = ${user.id}`;
		expect(q.sql).toBe(`UPDATE users SET "name" = ?, "email" = ? WHERE id = ?`);
		expect(q.values).toEqual(["Alice", "alice@example.com", 1]);
	});
});
