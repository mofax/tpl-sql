import type { Dialect, SqlNode } from "./types";
import { SqlQuery } from "./query";

export type { Dialect, Query } from "./types";

const IDENT_RE = /^[a-zA-Z0-9_.]+$/;

function validateIdent(name: string): void {
	if (name.length === 0) {
		throw new Error("Identifier must not be empty");
	}
	if (!IDENT_RE.test(name)) {
		throw new Error(`Invalid identifier: ${name}`);
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createIdentNode(name: string): SqlNode {
	validateIdent(name);
	return { kind: "ident", value: name };
}

function createListNode(values: unknown[]): SqlNode {
	if (values.length === 0) {
		throw new Error("IN-list must not be empty");
	}
	return { kind: "list", values };
}

function createInsertNode(rows: Record<string, unknown>[]): SqlNode {
	if (rows.length === 0) {
		throw new Error("Insert rows must not be empty");
	}
	const columns = Object.keys(rows[0]!);
	if (columns.length === 0) {
		throw new Error("Insert object must have at least one key");
	}
	return { kind: "insert", columns, rows };
}

function createUpdateNode(row: Record<string, unknown>, columns: string[]): SqlNode {
	return { kind: "update", columns, row };
}

interface SqlHelperNode {
	__sqlHelper: true;
	node: SqlNode;
	needsDisambiguation: boolean;
}

function sqlHelper(
	first: string | unknown[] | Record<string, unknown>,
	...rest: string[]
): SqlHelperNode {
	if (typeof first === "string") {
		return { __sqlHelper: true, node: createIdentNode(first), needsDisambiguation: false };
	}

	if (Array.isArray(first)) {
		if (first.length === 0) {
			throw new Error("Array must not be empty");
		}
		if (isPlainObject(first[0])) {
			if (rest.length > 0) {
				const key = rest[0]!;
				const values = (first as Record<string, unknown>[]).map((item) => item[key]);
				return { __sqlHelper: true, node: createListNode(values), needsDisambiguation: false };
			}
			return {
				__sqlHelper: true,
				node: createInsertNode(first as Record<string, unknown>[]),
				needsDisambiguation: false,
			};
		}
		return { __sqlHelper: true, node: createListNode(first), needsDisambiguation: false };
	}

	if (isPlainObject(first)) {
		const columns = Object.keys(first);
		if (columns.length === 0) {
			throw new Error("Object must have at least one key");
		}
		if (rest.length > 0) {
			return {
				__sqlHelper: true,
				node: createUpdateNode(first, rest),
				needsDisambiguation: false,
			};
		}
		return {
			__sqlHelper: true,
			node: { kind: "param", value: first },
			needsDisambiguation: true,
		};
	}

	throw new Error("Invalid sql() argument");
}

function isSqlHelperNode(value: unknown): value is SqlHelperNode {
	return (
		typeof value === "object" &&
		value !== null &&
		"__sqlHelper" in value &&
		(value as SqlHelperNode).__sqlHelper === true
	);
}

function disambiguateObject(obj: Record<string, unknown>, precedingRaw: string): SqlNode {
	const trimmed = precedingRaw.replace(/\s+/g, " ").trimEnd().toUpperCase();
	if (/\bSET\s*$/.test(trimmed)) {
		return createUpdateNode(obj, Object.keys(obj));
	}
	return createInsertNode([obj]);
}

function collectPrecedingRaw(nodes: SqlNode[]): string {
	let raw = "";
	for (let i = nodes.length - 1; i >= 0; i--) {
		const node = nodes[i]!;
		if (node.kind === "raw") {
			raw = node.value + raw;
		} else {
			break;
		}
	}
	return raw;
}

function isTemplateStringsArray(value: unknown): value is TemplateStringsArray {
	return Array.isArray(value) && "raw" in value;
}

export interface SQL {
	(strings: TemplateStringsArray, ...expressions: unknown[]): SqlQuery;
	(first: string | unknown[] | Record<string, unknown>, ...rest: string[]): SqlHelperNode;
}

export function SQL(dialect: Dialect): SQL {
	return function (
		first: TemplateStringsArray | string | unknown[] | Record<string, unknown>,
		...rest: unknown[]
	): SqlQuery | SqlHelperNode {
		if (isTemplateStringsArray(first)) {
			const nodes: SqlNode[] = [];
			const strings = first;
			const expressions = rest;

			for (let i = 0; i < strings.length; i++) {
				const rawStr = strings[i]!;
				if (rawStr.length > 0) {
					nodes.push({ kind: "raw", value: rawStr });
				}

				if (i < expressions.length) {
					const expr = expressions[i];

					if (expr instanceof SqlQuery) {
						nodes.push({ kind: "fragment", value: expr });
					} else if (isSqlHelperNode(expr)) {
						if (expr.needsDisambiguation) {
							const obj = (expr.node as { kind: "param"; value: unknown }).value as Record<
								string,
								unknown
							>;
							const precedingRaw = collectPrecedingRaw(nodes);
							nodes.push(disambiguateObject(obj, precedingRaw));
						} else {
							nodes.push(expr.node);
						}
					} else {
						nodes.push({ kind: "param", value: expr });
					}
				}
			}

			return new SqlQuery(nodes, dialect);
		}

		return sqlHelper(first as string | unknown[] | Record<string, unknown>, ...(rest as string[]));
	} as SQL;
}
