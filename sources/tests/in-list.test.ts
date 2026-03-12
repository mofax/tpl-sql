import { describe, expect, test } from "bun:test";
import { SQL } from "../main.ts";

describe("IN-list expansion", () => {
	const sql = SQL("sqlite");

	test("array of numbers", () => {
		const q = sql`SELECT * FROM users WHERE id IN ${sql([1, 2, 3])}`;
		expect(q.sql).toBe("SELECT * FROM users WHERE id IN (?, ?, ?)");
		expect(q.values).toEqual([1, 2, 3]);
	});

	test("array of numbers (postgres)", () => {
		const pg = SQL("postgres");
		const q = pg`SELECT * FROM users WHERE id IN ${pg([1, 2, 3])}`;
		expect(q.sql).toBe("SELECT * FROM users WHERE id IN ($1, $2, $3)");
		expect(q.values).toEqual([1, 2, 3]);
	});

	test("array of numbers (oracle)", () => {
		const ora = SQL("oracle");
		const q = ora`SELECT * FROM users WHERE id IN ${ora([1, 2, 3])}`;
		expect(q.sql).toBe("SELECT * FROM users WHERE id IN (:1, :2, :3)");
		expect(q.values).toEqual([1, 2, 3]);
	});

	test("array of strings", () => {
		const q = sql`SELECT * FROM users WHERE name IN ${sql(["Alice", "Bob"])}`;
		expect(q.sql).toBe("SELECT * FROM users WHERE name IN (?, ?)");
		expect(q.values).toEqual(["Alice", "Bob"]);
	});

	test("single-element array", () => {
		const q = sql`SELECT * FROM users WHERE id IN ${sql([42])}`;
		expect(q.sql).toBe("SELECT * FROM users WHERE id IN (?)");
		expect(q.values).toEqual([42]);
	});

	test("parameter indices account for preceding params", () => {
		const pg = SQL("postgres");
		const q = pg`SELECT * FROM users WHERE active = ${true} AND id IN ${pg([1, 2, 3])}`;
		expect(q.sql).toBe("SELECT * FROM users WHERE active = $1 AND id IN ($2, $3, $4)");
		expect(q.values).toEqual([true, 1, 2, 3]);
	});

	test("plucking key from object array", () => {
		const users = [
			{ id: 1, name: "Alice" },
			{ id: 2, name: "Bob" },
			{ id: 3, name: "Charlie" },
		];
		const q = sql`SELECT * FROM users WHERE id IN ${sql(users, "id")}`;
		expect(q.sql).toBe("SELECT * FROM users WHERE id IN (?, ?, ?)");
		expect(q.values).toEqual([1, 2, 3]);
	});

	test("throws on empty array", () => {
		expect(() => sql`SELECT * FROM users WHERE id IN ${sql([])}`).toThrow();
	});
});
