import { describe, expect, test } from "bun:test";
import { SQL } from "../main.ts";

describe("combined real-world queries", () => {
	const sql = SQL("sqlite");

	test("select with dynamic table, IN-list, and conditional filter", () => {
		const minAge = 21;
		const ids = [1, 2, 3];
		const q = sql`
			SELECT * FROM ${sql("public.users")}
			WHERE id IN ${sql(ids)}
			AND age > ${minAge}
		`;
		expect(q.sql).toContain(`"public"."users"`);
		expect(q.sql).toContain("(?, ?, ?)");
		expect(q.sql).toContain("AND age > ?");
		expect(q.values).toEqual([1, 2, 3, 21]);
	});

	test("insert with returning and subsequent query", () => {
		const data = { name: "Alice", email: "alice@example.com" };
		const q = sql`INSERT INTO users ${sql(data)} RETURNING *`;
		expect(q.sql).toBe(`INSERT INTO users ("name", "email") VALUES (?, ?) RETURNING *`);
	});

	test("update with dynamic columns and where clause", () => {
		const pg = SQL("postgres");
		const user = { id: 5, name: "Bob", email: "bob@example.com", age: 30 };
		const q = pg`UPDATE ${pg("users")} SET ${pg(user, "name", "email")} WHERE id = ${user.id} AND age > ${18}`;
		expect(q.sql).toBe(`UPDATE "users" SET "name" = $1, "email" = $2 WHERE id = $3 AND age > $4`);
		expect(q.values).toEqual(["Bob", "bob@example.com", 5, 18]);
	});

	test("complex query with multiple features", () => {
		const pg = SQL("postgres");
		const status = "active";
		const ids = [10, 20, 30];
		const extraFilter = pg`AND created_at > ${new Date("2024-01-01")}`;

		const q = pg`
			SELECT * FROM ${pg("public.orders")}
			WHERE status = ${status}
			AND user_id IN ${pg(ids)}
			${extraFilter}
			ORDER BY created_at DESC
		`;

		expect(q.values).toEqual([status, 10, 20, 30, new Date("2024-01-01")]);
		expect(q.sql).toContain("$1");
		expect(q.sql).toContain("$5");
		expect(q.sql).toContain(`"public"."orders"`);
	});

	test("direct values in INSERT", () => {
		const pg = SQL("postgres");
		const name = "Alice";
		const email = "alice@example.com";
		const q = pg`INSERT INTO users (name, email) VALUES (${name}, ${email}) RETURNING *`;
		expect(q.sql).toBe("INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *");
		expect(q.values).toEqual(["Alice", "alice@example.com"]);
	});
});
