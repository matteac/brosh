const PROMPT_SYM = ">";

const terminal = document.querySelector(".terminal");
const output = document.querySelector(".output");
const input = document.querySelector(".input");
const prompt = document.querySelector(".active-prompt");
const title = document.querySelector(".title");

class Sys {
	builtins = {};
	argv = [];
	cur_dir = "/";
	home_dir = "/";
	path = ["/bin"];
	file_sys = {};

	constructor() {
		this.create_dir("/bin");

		this.add_builtin("mkdir");
		this.add_builtin("touch");
		this.add_builtin("rm");
		this.add_builtin("ls");

		this.add_builtin("clear");
		this.add_builtin("cls", "clear");

		this.add_builtin("add_to_path");
		this.add_builtin("print_path");

		this.add_builtin("pwd");
		this.add_builtin("cd");

		this.add_builtin("write");
		this.add_builtin("append");

		this.add_builtin("builtins", "list_builtins");
	}

	add_builtin(cmd, fn_name) {
		fn_name = fn_name ? fn_name : cmd;

		this.builtins[cmd] = fn_name;

		this.create_file(`/bin/${cmd}`);
		this.write_file(`/bin/${cmd}`, `sys.${fn_name}()`);
	}

	exec(cmd, args) {
		const file = this.get_file_from_path(cmd);
		if (!file) {
			this.eprint(`unknown command: '${cmd}'`);
			return;
		}

		this.argv = args;
		eval(file.content);
		this.argv = [];
	}

	resolve_path(file_path) {
		if (file_path.startsWith("/")) {
			return file_path;
		}

		const full_path = `${this.cur_dir}/${file_path}`;
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

	exists(file_path) {
		const full_path = this.resolve_path(file_path);
		const dirs = full_path.split("/").filter(Boolean);
		let _dir = this.file_sys;

		for (const dir of dirs) {
			if (_dir[dir]) {
				_dir = _dir[dir];
				continue;
			}
			return false;
		}

		return true;
	}

	is_file(file_path) {
		const full_path = this.resolve_path(file_path);
		const dirs = full_path.split("/").filter(Boolean);
		let _dir = this.file_sys;

		for (const dir of dirs) {
			if (_dir[dir]) {
				_dir = _dir[dir];
				continue;
			}
			return false;
		}

		return _dir.__meta__file;
	}

	get_file(file) {
		const dir_parts = file.split("/").filter(Boolean);
		let _dir = this.file_sys;

		for (const sub of dir_parts) {
			if (!_dir[sub]) {
				return null;
			}
			_dir = _dir[sub];
		}

		if (_dir.__meta__file) {
			return _dir;
		}

		return null;
	}

	get_file_from_path(file) {
		path: for (const dir of this.path) {
			const dir_parts = dir.split("/").filter(Boolean);
			let _dir = this.file_sys;

			for (const sub of dir_parts) {
				if (!_dir[sub]) {
					continue path;
				}
				_dir = _dir[sub];
			}

			if (_dir[file] && _dir[file]) {
				return _dir[file];
			}
		}
		return null;
	}

	create_file(file_path) {
		const full_path = this.resolve_path(file_path);
		const dirs = full_path.split("/").filter(Boolean);
		const filename = dirs.pop();
		let _dir = this.file_sys;

		if (dirs.length > 0) {
			for (const dir of dirs) {
				if (!_dir[dir]) {
					return `not a directory: '${dir}'`;
				}
				_dir = _dir[dir];
			}
		}

		if (_dir[filename]) {
			return `file already exists: '${filename}'`;
		}

		_dir[filename] = { __meta__file: true, content: "" };
	}

	create_dir(dir_path) {
		const full_path = this.resolve_path(dir_path);
		const dirs = full_path.split("/").filter(Boolean);
		const dirname = dirs.pop();
		let _dir = this.file_sys;

		for (const dir of dirs) {
			if (!_dir[dir]) {
				return `not a directory: '${dir}'`;
			}
			_dir = _dir[dir];
		}

		if (_dir[dirname]) {
			return `directory already exists: '${dirname}'`;
		}

		_dir[dirname] = { __meta__file: false };
	}

	delete(file_path) {
		const full_path = this.resolve_path(file_path);
		const dirs = full_path.split("/").filter(Boolean);
		const file_name = dirs.pop();
		let _dir = this.file_sys;

		for (const dir of dirs) {
			if (!_dir[dir]) {
				return `not a directory: '${dir}'`;
			}
			_dir = _dir[dir];
		}

		if (!_dir[file_name]) {
			return `file doesn't exists: '${file_name}'`;
		}

		delete _dir[file_name];
	}

	list(path) {
		const full_path = this.resolve_path(path);
		const dirs = full_path.split("/").filter(Boolean);
		let _dir = this.file_sys;

		for (const dir of dirs) {
			if (!_dir[dir]) {
				return `not a directory: '${dir}'`;
			}
			_dir = _dir[dir];
		}

		let entries = {};
		for (const key of Object.keys(_dir).filter((e) => e !== "__meta__file")) {
			entries[key] = _dir[key].__meta__file;
		}

		return entries;
	}

	write_file(file_path, content) {
		const file = this.get_file(file_path);
		if (!file) {
			return false;
		}

		file.content = content;
		return true;
	}

	append_file(file_path, content) {
		const file = this.get_file(file_path);
		if (!file) {
			return false;
		}

		file.content += content;
		return true;
	}

	print(string) {
		for (const line of string.split("\n"))
			output.innerHTML += `<div class="output-line">${line}</div>`;
	}
	eprint(string) {
		for (const line of string.split("\n"))
			output.innerHTML += `<div class="error output-line">${line}</div>`;
	}

	// builtin commands
	mkdir() {
		if (this.argv.length <= 0) {
			this.eprint("Usage: mkdir &lt;directory(ies)&gt;");
			return;
		}
		for (const dir of this.argv) {
			const err = this.create_dir(dir);
			if (err) {
				this.eprint(err);
			}
		}
	}

	touch() {
		if (this.argv.length <= 0) {
			this.eprint("Usage: touch &lt;file(s)&gt;");
			return;
		}
		for (const file of this.argv) {
			const err = this.create_file(file);
			if (err) {
				this.eprint(err);
			}
		}
	}

	rm() {
		if (this.argv.length <= 0) {
			this.eprint("Usage: rm &lt;file(s)&gt;");
			return;
		}
		for (const file of this.argv) {
			const err = this.delete(file);
			if (err) {
				this.eprint(err);
			}
		}
	}

	ls() {
		if (this.argv.length <= 0) {
			const entries = this.list(this.cur_dir);
			for (const key of Object.keys(entries)) {
				this.print(`${entries[key] ? "f" : "d"} ${key}`);
			}
			return;
		}
		for (const dir of this.argv) {
			this.print(dir);
			const entries = this.list(dir);
			for (const key of Object.keys(entries)) {
				this.print(`${entries[key] ? "f" : "d"} ${key}`);
			}
		}
	}

	clear() {
		output.innerHTML = "";
	}

	add_to_path() {
		if (this.argv.length <= 0) {
			this.eprint("Usage: add_to_path &lt;directory(ies)&gt;");
			return;
		}
		for (const path of this.argv) {
			const dir = this.resolve_path(path);
			this.path.push(dir);
		}
	}

	print_path() {
		this.path.forEach(this.print);
	}

	pwd() {
		this.print(this.cur_dir);
	}

	cd() {
		if (this.argv.length > 1) {
			this.eprint("Usage: cd &lt;directory&gt;");
			return;
		}
		if (this.argv.length <= 0) {
			this.cur_dir = this.home_dir;
			return;
		}

		const dir = this.resolve_path(this.argv[0]);
		if (!this.exists(dir)) {
			this.eprint(`directory doesn't exists: '${dir}'`);
			return;
		}

		this.cur_dir = dir;
	}

	list_builtins() {
		Object.keys(this.builtins).forEach(this.print);
	}
}

const sys = new Sys();

prompt.innerHTML = `${sys.cur_dir} ${PROMPT_SYM}`;
title.innerHTML = `${sys.cur_dir}`;

input.addEventListener("keydown", (event) => {
	if (event.key == "Enter") {
		const src = event.target.value;
		sys.print(
			`<span class="prompt">${sys.cur_dir} ${PROMPT_SYM}</span> ${src}`,
		);

		event.target.value = "";
		const [cmd, ...args] = src
			.split(" ")
			.map((e) => e.trim())
			.filter(Boolean);

		if (!cmd) {
			return;
		}

		try {
			sys.exec(cmd, args);
		} catch (err) {
			sys.eprint(`${err}`);
		}

		output.scrollTo(0, output.scrollHeight);

		prompt.innerHTML = `${sys.cur_dir} ${PROMPT_SYM}`;
		title.innerHTML = `${sys.cur_dir}`;
	}
});
