import { describe, expect, test } from "bun:test";
import { SQL } from "../main.ts";

describe("safe identifiers", () => {
	const sql = new SQL("sqlite");

	test("simple table name", () => {
		const q = sql`SELECT * FROM ${sql("users")}`;
		expect(q.sql).toBe(`SELECT * FROM "users"`);
		expect(q.values).toEqual([]);
	});

	test("schema-qualified name", () => {
		const q = sql`SELECT * FROM ${sql("public.users")}`;
		expect(q.sql).toBe(`SELECT * FROM "public"."users"`);
		expect(q.values).toEqual([]);
	});

	test("identifier with underscore", () => {
		const q = sql`SELECT * FROM ${sql("user_accounts")}`;
		expect(q.sql).toBe(`SELECT * FROM "user_accounts"`);
	});

	test("identifier does not consume a parameter slot", () => {
		const pg = new SQL("postgres");
		const q = pg`SELECT * FROM ${pg("users")} WHERE id = ${1}`;
		expect(q.sql).toBe(`SELECT * FROM "users" WHERE id = $1`);
		expect(q.values).toEqual([1]);
	});

	test("throws on invalid identifier characters", () => {
		expect(() => sql`SELECT * FROM ${sql("users; DROP TABLE users")}`).toThrow();
	});

	test("throws on empty identifier", () => {
		expect(() => sql`SELECT * FROM ${sql("")}`).toThrow();
	});
});
