import { describe, expect, test } from "bun:test";
import { SQL } from "../main.ts";

describe("edge cases", () => {
	const sql = SQL("sqlite");

	test("query result caching returns same values", () => {
		const q = sql`SELECT * FROM users WHERE id = ${1}`;
		const sql1 = q.sql;
		const sql2 = q.sql;
		const values1 = q.values;
		const values2 = q.values;
		expect(sql1).toBe(sql2);
		expect(values1).toBe(values2);
	});

	test("dotted identifier with 3 segments", () => {
		const q = sql`SELECT * FROM ${sql("a.b.c")}`;
		expect(q.sql).toBe(`SELECT * FROM "a"."b"."c"`);
		expect(q.values).toEqual([]);
	});

	test("identifier with numbers", () => {
		const q = sql`SELECT * FROM ${sql("table1")}`;
		expect(q.sql).toBe(`SELECT * FROM "table1"`);
		expect(q.values).toEqual([]);
	});

	test("pluck missing key produces undefined values", () => {
		const users = [{ id: 1 }, { id: 2 }];
		const q = sql`SELECT * FROM users WHERE name IN ${sql(users, "name")}`;
		expect(q.sql).toBe("SELECT * FROM users WHERE name IN (?, ?)");
		expect(q.values).toEqual([undefined, undefined]);
	});

	test("insert with undefined values", () => {
		const data = { a: 1, b: undefined };
		const q = sql`INSERT INTO t ${sql(data)}`;
		expect(q.sql).toBe(`INSERT INTO t ("a", "b") VALUES (?, ?)`);
		expect(q.values).toEqual([1, undefined]);
	});

	test("fragment containing identifier and list with postgres param indexing", () => {
		const pg = SQL("postgres");
		const frag = pg`SELECT * FROM ${pg("users")} WHERE id IN ${pg([10, 20])}`;
		const q = pg`${frag} AND active = ${true}`;
		expect(q.sql).toBe(`SELECT * FROM "users" WHERE id IN ($1, $2) AND active = $3`);
		expect(q.values).toEqual([10, 20, true]);
	});

	test("disambiguation with extra whitespace before interpolation", () => {
		const data = { a: 1, b: 2 };
		const q = sql`UPDATE t SET   ${sql(data)}`;
		expect(q.sql).toBe(`UPDATE t SET   "a" = ?, "b" = ?`);
		expect(q.values).toEqual([1, 2]);
	});

	test("disambiguation is case insensitive (lowercase set)", () => {
		const data = { a: 1, b: 2 };
		const q = sql`update t set ${sql(data)} WHERE id = ${99}`;
		expect(q.sql).toBe(`update t set "a" = ?, "b" = ? WHERE id = ?`);
		expect(q.values).toEqual([1, 2, 99]);
	});

	test("disambiguation defaults to insert when preceding text does not end with SET", () => {
		const data = { a: 1 };
		const q = sql`SELECT ${sql(data)}`;
		expect(q.sql).toBe(`SELECT ("a") VALUES (?)`);
		expect(q.values).toEqual([1]);
	});
});
