import { describe, expect, test } from "bun:test";
import { SQL } from "../main.ts";

describe("nested fragments", () => {
	const sql = SQL("sqlite");

	test("nested sql fragment is composed inline", () => {
		const where = sql`WHERE id = ${1}`;
		const q = sql`SELECT * FROM users ${where}`;
		expect(q.sql).toBe("SELECT * FROM users WHERE id = ?");
		expect(q.values).toEqual([1]);
	});

	test("multiple nested fragments", () => {
		const where = sql`WHERE active = ${true}`;
		const order = sql`ORDER BY name`;
		const q = sql`SELECT * FROM users ${where} ${order}`;
		expect(q.sql).toBe("SELECT * FROM users WHERE active = ? ORDER BY name");
		expect(q.values).toEqual([true]);
	});

	test("deeply nested fragments", () => {
		const inner = sql`id = ${1}`;
		const middle = sql`WHERE ${inner} AND active = ${true}`;
		const q = sql`SELECT * FROM users ${middle}`;
		expect(q.sql).toBe("SELECT * FROM users WHERE id = ? AND active = ?");
		expect(q.values).toEqual([1, true]);
	});

	test("empty fragment is a no-op", () => {
		const q = sql`SELECT * FROM users ${sql``}`;
		expect(q.sql).toBe("SELECT * FROM users ");
		expect(q.values).toEqual([]);
	});

	test("conditional fragment (truthy)", () => {
		const filterAge = true;
		const minAge = 21;
		const ageFilter = sql`AND age > ${minAge}`;
		const q = sql`SELECT * FROM users WHERE active = ${true} ${filterAge ? ageFilter : sql``}`;
		expect(q.sql).toBe("SELECT * FROM users WHERE active = ? AND age > ?");
		expect(q.values).toEqual([true, 21]);
	});

	test("conditional fragment (falsy)", () => {
		const filterAge = false;
		const minAge = 21;
		const ageFilter = sql`AND age > ${minAge}`;
		const q = sql`SELECT * FROM users WHERE active = ${true} ${filterAge ? ageFilter : sql``}`;
		expect(q.sql).toBe("SELECT * FROM users WHERE active = ? ");
		expect(q.values).toEqual([true]);
	});

	test("parameter indices are correct across nested fragments (postgres)", () => {
		const pg = SQL("postgres");
		const a = pg`a = ${1}`;
		const b = pg`b = ${2}`;
		const q = pg`SELECT * FROM t WHERE ${a} AND ${b} AND c = ${3}`;
		expect(q.sql).toBe("SELECT * FROM t WHERE a = $1 AND b = $2 AND c = $3");
		expect(q.values).toEqual([1, 2, 3]);
	});
});
