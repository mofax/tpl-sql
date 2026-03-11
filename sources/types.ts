export type Dialect = "sqlite" | "mysql" | "postgres" | "oracle";

export interface Query {
	readonly sql: string;
	readonly values: unknown[];
}

export type SqlNode =
	| { kind: "raw"; value: string }
	| { kind: "param"; value: unknown }
	| { kind: "fragment"; value: { nodes: SqlNode[] } }
	| { kind: "ident"; value: string }
	| { kind: "list"; values: unknown[] }
	| { kind: "insert"; columns: string[]; rows: Record<string, unknown>[] }
	| { kind: "update"; columns: string[]; row: Record<string, unknown> };
