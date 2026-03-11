import type { Dialect, SqlNode, Query } from "./types";
import { serialize } from "./serialize";

export class SqlQuery implements Query {
	readonly nodes: SqlNode[];
	private readonly dialect: Dialect;
	private _result?: { sql: string; values: unknown[] };

	constructor(nodes: SqlNode[], dialect: Dialect) {
		this.nodes = nodes;
		this.dialect = dialect;
	}

	private getResult() {
		return (this._result ??= serialize(this.nodes, this.dialect));
	}

	get sql(): string {
		return this.getResult().sql;
	}

	get values(): unknown[] {
		return this.getResult().values;
	}
}
