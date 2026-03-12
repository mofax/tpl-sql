import { describe, expect, test } from "bun:test";
import { SQL } from "../main.ts";

describe("error handling", () => {
	const sql = SQL("sqlite");

	test("sql(number) throws invalid argument", () => {
		expect(() => sql(123 as any)).toThrow("Invalid sql() argument");
	});

	test("sql(boolean) throws invalid argument", () => {
		expect(() => sql(true as any)).toThrow("Invalid sql() argument");
	});

	test("identifier with spaces throws", () => {
		expect(() => sql`SELECT * FROM ${sql("foo bar")}`).toThrow("Invalid identifier");
	});

	test("identifier with semicolon throws", () => {
		expect(() => sql`SELECT * FROM ${sql("users;")}`).toThrow("Invalid identifier");
	});

	test("identifier with parentheses throws", () => {
		expect(() => sql`SELECT * FROM ${sql("fn()")}`).toThrow("Invalid identifier");
	});

	test("empty object throws", () => {
		expect(() => sql`INSERT INTO t ${sql({})}`).toThrow("Object must have at least one key");
	});

	test("empty array throws", () => {
		expect(() => sql`SELECT * FROM t WHERE id IN ${sql([])}`).toThrow("Array must not be empty");
	});

	test("array with empty object throws", () => {
		expect(() => sql`INSERT INTO t ${sql([{}])}`).toThrow(
			"Insert object must have at least one key",
		);
	});
});
