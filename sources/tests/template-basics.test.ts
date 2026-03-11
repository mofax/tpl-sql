import { describe, expect, test } from "bun:test";
import { SQL } from "../main.ts";

describe("tagged template basics", () => {
	test("query with no interpolations", () => {
		const sql = new SQL("sqlite");
		const q = sql`SELECT 1`;
		expect(q.sql).toBe("SELECT 1");
		expect(q.values).toEqual([]);
	});

	test("single parameter (sqlite)", () => {
		const sql = new SQL("sqlite");
		const id = 42;
		const q = sql`SELECT * FROM books WHERE id = ${id}`;
		expect(q.sql).toBe("SELECT * FROM books WHERE id = ?");
		expect(q.values).toEqual([42]);
	});

	test("single parameter (postgres)", () => {
		const sql = new SQL("postgres");
		const id = 42;
		const q = sql`SELECT * FROM books WHERE id = ${id}`;
		expect(q.sql).toBe("SELECT * FROM books WHERE id = $1");
		expect(q.values).toEqual([42]);
	});

	test("single parameter (oracle)", () => {
		const sql = new SQL("oracle");
		const id = 42;
		const q = sql`SELECT * FROM books WHERE id = ${id}`;
		expect(q.sql).toBe("SELECT * FROM books WHERE id = :1");
		expect(q.values).toEqual([42]);
	});

	test("multiple parameters", () => {
		const sql = new SQL("sqlite");
		const q = sql`SELECT * FROM books WHERE id = ${1} AND title = ${"Dune"}`;
		expect(q.sql).toBe("SELECT * FROM books WHERE id = ? AND title = ?");
		expect(q.values).toEqual([1, "Dune"]);
	});

	test("multiple parameters (postgres)", () => {
		const sql = new SQL("postgres");
		const q = sql`SELECT * FROM books WHERE id = ${1} AND title = ${"Dune"}`;
		expect(q.sql).toBe("SELECT * FROM books WHERE id = $1 AND title = $2");
		expect(q.values).toEqual([1, "Dune"]);
	});

	test("null and undefined parameters", () => {
		const sql = new SQL("sqlite");
		const q = sql`INSERT INTO t (a, b) VALUES (${null}, ${undefined})`;
		expect(q.sql).toBe("INSERT INTO t (a, b) VALUES (?, ?)");
		expect(q.values).toEqual([null, undefined]);
	});

	test("boolean parameters", () => {
		const sql = new SQL("sqlite");
		const q = sql`SELECT * FROM users WHERE active = ${true}`;
		expect(q.values).toEqual([true]);
	});

	test("empty template", () => {
		const sql = new SQL("sqlite");
		const q = sql``;
		expect(q.sql).toBe("");
		expect(q.values).toEqual([]);
	});
});
