import { describe, expect, test } from "bun:test";
import { SQL } from "../main.ts";

describe("context-sensitive sql() disambiguation", () => {
	const sql = SQL("sqlite");

	test("sql(obj) after INSERT INTO produces insert", () => {
		const data = { a: 1, b: 2 };
		const q = sql`INSERT INTO t ${sql(data)}`;
		expect(q.sql).toBe(`INSERT INTO t ("a", "b") VALUES (?, ?)`);
	});

	test("sql(obj) after SET produces update", () => {
		const data = { a: 1, b: 2 };
		const q = sql`UPDATE t SET ${sql(data)} WHERE id = ${99}`;
		expect(q.sql).toBe(`UPDATE t SET "a" = ?, "b" = ? WHERE id = ?`);
		expect(q.values).toEqual([1, 2, 99]);
	});

	test("sql(obj, ...keys) after SET produces update with selected keys", () => {
		const data = { a: 1, b: 2, c: 3 };
		const q = sql`UPDATE t SET ${sql(data, "a", "c")} WHERE id = ${99}`;
		expect(q.sql).toBe(`UPDATE t SET "a" = ?, "c" = ? WHERE id = ?`);
		expect(q.values).toEqual([1, 3, 99]);
	});

	test("sql([obj, obj]) always produces bulk insert", () => {
		const rows = [{ a: 1 }, { a: 2 }];
		const q = sql`INSERT INTO t ${sql(rows)}`;
		expect(q.sql).toBe(`INSERT INTO t ("a") VALUES (?), (?)`);
		expect(q.values).toEqual([1, 2]);
	});
});
