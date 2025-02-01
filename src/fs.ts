import type { Env, Err } from "./sys";

export interface File {
	__meta_file: true;
	content: string;
}

export interface Directory {
	[key: string]: File | Directory;
}

export class FileSys {
	fs: Directory;
	env: Env;

	constructor(env: Env) {
		this.fs = {};
		this.env = env;

		this.create_dir("/bin");
	}

	resolve_path(path: string): string {
		if (path.startsWith("/")) {
			return path;
		}

		const full_path = `${this.env.current_dir}/${path}`;
		const parts = full_path.split("/").filter(Boolean);
		const resolved = [];

		for (const part of parts) {
			if (part === "..") {
				resolved.pop();
			} else if (part !== ".") {
				resolved.push(part);
			}
		}

		return `/${resolved.join("/")}`;
	}

	create_dir(path: string): Err | null {
		const parts = this.resolve_path(path).split("/").filter(Boolean);
		const dirname = parts.pop() as string;
		let dir = this.fs;

		if (!dirname) return { msg: `Cannot create ${path}`, __meta_err: true };

		for (const part of parts) {
			const file = dir[part];
			if (!file) {
				return { msg: `Not a directory: ${part}`, __meta_err: true };
			}
			dir = file as Directory;
		}

		if (dir[dirname]) {
			return {
				msg: `Already exists: ${this.resolve_path(path)}`,
				__meta_err: true,
			};
		}

		dir[dirname] = {} as Directory;
		return null;
	}

	create_file(path: string): Err | null {
		const parts = this.resolve_path(path).split("/").filter(Boolean);
		const filename = parts.pop() as string;
		let dir = this.fs;

		if (!filename) return { msg: `Cannot create ${path}`, __meta_err: true };

		for (const part of parts) {
			const file = dir[part];
			if (!file) {
				return { msg: `Not a directory: ${part}`, __meta_err: true };
			}
			dir = file as Directory;
		}

		if (dir[filename]) {
			return {
				msg: `Already exists: ${this.resolve_path(filename)}`,
				__meta_err: true,
			};
		}

		dir[filename] = { __meta_file: true } as File;
		return null;
	}

	read_file(path: string): string | Err {
		const file = this.get_file(path);
		if (file) {
			return file.content;
		}
		return {
			msg: `File doesn't exists: ${this.resolve_path(path)}`,
			__meta_err: true,
		};
	}

	write_file(path: string, content: string): boolean {
		const file = this.get_file(path);
		if (!file) return false;

		file.content = content;
		return true;
	}

	append_file(path: string, content: string): boolean {
		const file = this.get_file(path);
		if (!file) return false;

		file.content += content;
		return true;
	}

	delete(path: string): Err | null {
		const parts = this.resolve_path(path).split("/").filter(Boolean);
		const name = parts.pop() as string;

		if (!name && path.trim() === "/") {
			this.fs = {};
			return null;
		}

		let dir = this.fs;

		for (const part of parts) {
			if (!dir[part] || this.is_file_obj(dir[part])) {
				return { msg: `Not a directory: ${part}`, __meta_err: true };
			}
			dir = dir[part] as Directory;
		}

		if (!dir[name]) {
			return {
				msg: `File or directory doesn't exist: ${name}`,
				__meta_err: true,
			};
		}

		delete dir[name];
		return null;
	}

	exists(path: string): boolean {
		const parts = this.resolve_path(path).split("/").filter(Boolean);
		let dir = this.fs;

		for (const part of parts) {
			if (!dir[part]) return false;
			dir = dir[part] as Directory;
		}

		return true;
	}

	is_file(path: string): boolean {
		const file = this.get_file(path);
		if (!file) return false;
		return true;
	}
	is_dir(path: string): boolean {
		const dir = this.get_dir(path);
		if (!dir) return false;
		return true;
	}

	list_dir(path: string): { [name: string]: boolean } | Err {
		const dir = this.get_dir(path);
		if (!dir)
			return { msg: "Directory doesn't exists: ${path}", __meta_err: true };

		const entries: { [name: string]: boolean } = {};
		for (const key of Object.keys(dir)) {
			entries[key] = this.is_file(`${path}/${key}`);
		}

		return entries;
	}

	get_file(path: string): File | null {
		const full_path = this.resolve_path(path);
		const dirs = full_path.split("/").filter(Boolean);
		let dir = this.fs;

		for (const part of dirs) {
			if (!dir[part]) return null;
			dir = dir[part] as Directory;
		}

		return this.is_file_obj(dir) ? dir : null;
	}

	private get_dir(path: string): Directory | null {
		const full_path = this.resolve_path(path);
		const dirs = full_path.split("/").filter(Boolean);
		let dir = this.fs;

		for (const part of dirs) {
			if (!dir[part]) return null;
			dir = dir[part] as Directory;
		}

		return this.is_file_obj(dir) ? null : dir;
	}

	// @ts-ignore:
	private is_file_obj(obj): obj is File {
		return obj && obj.__meta_file === true;
	}
}
