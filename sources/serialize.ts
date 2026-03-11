import type { Dialect, SqlNode } from "./types";

type PlaceholderFn = (index: number) => string;

const placeholders: Record<Dialect, PlaceholderFn> = {
	sqlite: () => "?",
	mysql: () => "?",
	postgres: (i) => `$${i}`,
	oracle: (i) => `:${i}`,
};

function quoteIdent(name: string): string {
	return name
		.split(".")
		.map((part) => `"${part}"`)
		.join(".");
}

function serializeNodes(
	nodes: SqlNode[],
	placeholder: PlaceholderFn,
	paramIndex: number,
): { sql: string; values: unknown[]; paramIndex: number } {
	let out = "";
	const values: unknown[] = [];

	for (const node of nodes) {
		switch (node.kind) {
			case "raw":
				out += node.value;
				break;
			case "param":
				out += placeholder(paramIndex++);
				values.push(node.value);
				break;
			case "fragment": {
				const result = serializeNodes(node.value.nodes, placeholder, paramIndex);
				out += result.sql;
				values.push(...result.values);
				paramIndex = result.paramIndex;
				break;
			}
			case "ident":
				out += quoteIdent(node.value);
				break;
			case "list": {
				const phs = node.values.map(() => placeholder(paramIndex++));
				out += `(${phs.join(", ")})`;
				values.push(...node.values);
				break;
			}
			case "insert": {
				const cols = node.columns.map((c) => `"${c}"`).join(", ");
				const rowsSql = node.rows.map(() => {
					const vals = node.columns.map(() => placeholder(paramIndex++));
					return `(${vals.join(", ")})`;
				});
				out += `(${cols}) VALUES ${rowsSql.join(", ")}`;
				for (const row of node.rows) {
					for (const col of node.columns) {
						values.push(row[col]);
					}
				}
				break;
			}
			case "update": {
				const parts = node.columns.map((col) => {
					const ph = placeholder(paramIndex++);
					values.push(node.row[col]);
					return `"${col}" = ${ph}`;
				});
				out += parts.join(", ");
				break;
			}
		}
	}

	return { sql: out, values, paramIndex };
}

export function serialize(nodes: SqlNode[], dialect: Dialect) {
	const result = serializeNodes(nodes, placeholders[dialect], 1);
	return { sql: result.sql, values: result.values };
}
