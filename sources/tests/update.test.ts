import { describe, expect, test } from "bun:test";
import { SQL } from "../main.ts";

describe("update helper", () => {
	const sql = new SQL("sqlite");

	test("update with specific columns", () => {
		const user = { id: 1, name: "Alice", email: "alice@example.com" };
		const q = sql`UPDATE users SET ${sql(user, "name", "email")} WHERE id = ${user.id}`;
		expect(q.sql).toBe(`UPDATE users SET "name" = ?, "email" = ? WHERE id = ?`);
		expect(q.values).toEqual(["Alice", "alice@example.com", 1]);
	});

	test("update with specific columns (postgres)", () => {
		const pg = new SQL("postgres");
		const user = { id: 1, name: "Alice", email: "alice@example.com" };
		const q = pg`UPDATE users SET ${pg(user, "name", "email")} WHERE id = ${user.id}`;
		expect(q.sql).toBe(`UPDATE users SET "name" = $1, "email" = $2 WHERE id = $3`);
		expect(q.values).toEqual(["Alice", "alice@example.com", 1]);
	});

	test("update with all keys from object", () => {
		const user = { name: "Alice", email: "alice@example.com" };
		const q = sql`UPDATE users SET ${sql(user)} WHERE id = ${1}`;
		expect(q.sql).toBe(`UPDATE users SET "name" = ?, "email" = ? WHERE id = ?`);
		expect(q.values).toEqual(["Alice", "alice@example.com", 1]);
	});

	test("update with single column", () => {
		const user = { id: 1, name: "Alice" };
		const q = sql`UPDATE users SET ${sql(user, "name")} WHERE id = ${user.id}`;
		expect(q.sql).toBe(`UPDATE users SET "name" = ? WHERE id = ?`);
		expect(q.values).toEqual(["Alice", 1]);
	});

	test("update with null value", () => {
		const user = { name: null };
		const q = sql`UPDATE users SET ${sql(user)} WHERE id = ${1}`;
		expect(q.sql).toBe(`UPDATE users SET "name" = ? WHERE id = ?`);
		expect(q.values).toEqual([null, 1]);
	});
});
