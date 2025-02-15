import type { Editor } from "./ed";
import type { FileSys } from "./fs";
import type { IO } from "./io";
import type { Env } from "./sys";

export class Shell {
	fs: FileSys;
	io: IO;
	ed: Editor;
	env: Env;
	builtins: string[];
	aliases: Map<string, string>;
	history: { cmds: string[]; index: number; blacklist: string[] };

	constructor(fs: FileSys, io: IO, ed: Editor, env: Env) {
		this.fs = fs;
		this.io = io;
		this.ed = ed;
		this.env = env;
		this.builtins = [];
		this.aliases = new Map();
		this.history = { cmds: [], index: -1, blacklist: [] };

		this.add_builtin("clear");
		this.aliases.set("cls", "clear");

		this.add_builtin("cd");
		this.add_builtin("ls");
		this.add_builtin("pwd");

		this.add_builtin("set");
		this.add_builtin("see");
		this.add_builtin("alias");

		this.add_builtin("mkdir");
		this.add_builtin("touch");
		this.add_builtin("rm");
		this.add_builtin("cat");
		this.add_builtin("edit");

		this.add_builtin("js");
		this.add_builtin("bf");

		this.add_builtin("hist");
		this.blacklist_hist("hist");

		this.add_builtin("builtins", "list_builtins");

		this.fs.create_file("/bin/example");
		this.fs.write_file(
			"/bin/example",
			`function main(argc, argv) {
  this.io.print(\`2 + 5 = \${sum(2, 5)}\`);
}
return main


function sum(a, b) {
  return a + b;
}
`,
		);

		this.fs.create_dir("/dev");

		// brainfuck example file
		// see https://en.wikipedia.org/wiki/Brainfuck#Hello_World!
		this.fs.create_file("/dev/example.bf");
		this.fs.write_file(
			"/dev/example.bf",
			`++++++++                Set Cell #0 to 8
[
    >++++               Add 4 to Cell #1; this will always set Cell #1 to 4
    [                   as the cell will be cleared by the loop
        >++             Add 2 to Cell #2
        >+++            Add 3 to Cell #3
        >+++            Add 3 to Cell #4
        >+              Add 1 to Cell #5
        <<<<-           Decrement the loop counter in Cell #1
    ]                   Loop until Cell #1 is zero; number of iterations is 4
    >+                  Add 1 to Cell #2
    >+                  Add 1 to Cell #3
    >-                  Subtract 1 from Cell #4
    >>+                 Add 1 to Cell #6
    [<]                 Move back to the first zero cell you find; this will
                        be Cell #1 which was cleared by the previous loop
    <-                  Decrement the loop Counter in Cell #0
]                       Loop until Cell #0 is zero; number of iterations is 8

The result of this is:
Cell no :   0   1   2   3   4   5   6
Contents:   0   0  72 104  88  32   8
Pointer :   ^

>>.                     Cell #2 has value 72 which is 'H'
>---.                   Subtract 3 from Cell #3 to get 101 which is 'e'
+++++++..+++.           Likewise for 'llo' from Cell #3
>>.                     Cell #5 is 32 for the space
<-.                     Subtract 1 from Cell #4 for 87 to give a 'W'
<.                      Cell #3 was set to 'o' from the end of 'Hello'
+++.------.--------.    Cell #3 for 'rl' and 'd'
>>+.                    Add 1 to Cell #5 gives us an exclamation point
>++.                    And finally a newline from Cell #6`,
		);
	}

	add_to_hist(cmd: string, args: string[]) {
		if (this.history.blacklist.includes(cmd)) {
			return;
		}

		const str = `${cmd} ${args.join(" ")}`.trim();
		if (this.history.cmds[this.history.cmds.length - 1] === str) {
			return;
		}

		this.history.cmds.push(str);
		this.history.index = this.history.cmds.length;
	}
	blacklist_hist(cmd: string) {
		this.history.blacklist.push(cmd);
	}

	get_prev_cmd(): string | null {
		if (this.history.index > 0) {
			this.history.index -= 1;
			return this.history.cmds[this.history.index];
		}

		return null;
	}
	get_next_cmd(): string {
		if (this.history.index < this.history.cmds.length) {
			this.history.index += 1;
			if (this.history.index === this.history.cmds.length) {
				return "";
			}
			return this.history.cmds[this.history.index];
		}
		return "";
	}

	get_exe(cmd: string): string | null {
		const path = this.env.vars.PATH;
		if (!path) {
			this.io.eprint("PATH is not set");
			return null;
		}

		for (const dir of path.split(":")) {
			if (this.fs.exists(`${dir}/${cmd}`)) {
				return this.fs.read_file(`${dir}/${cmd}`) as string;
			}
		}
		return null;
	}

	exec(str: string): number {
		let [cmd, ...args] = str.split(" ").filter(Boolean);
		if (!cmd) {
			return 0;
		}

		while (this.aliases.has(cmd)) {
			cmd = this.aliases.get(cmd) as string;
		}

		this.add_to_hist(cmd, args);
		this.history.index = this.history.cmds.length; // reset hist index

		const exe = this.get_exe(cmd);

		if (!exe) {
			this.io.eprint(`Unknown command: ${cmd}`);
			return 1;
		}

		return this.run(exe, args);
	}

	run(source: string, args: string[]): number {
		const fn = new Function(source).call(this);
		return fn.call(this, args.length, args);
	}

	add_builtin(name: string, fn_name?: string) {
		this.fs.create_file(`/bin/${name}`);
		this.fs.write_file(
			`/bin/${name}`,
			`return this.${fn_name ? fn_name : name}`,
		);
		this.builtins.push(name);
	}

	clear(_argc: number, _argv: string[]): number {
		this.io.clear();
		return 0;
	}

	cd(argc: number, argv: string[]): number {
		if (argc < 0 || argc > 1) {
			this.io.eprint("Usage: cd &lt;DIRECTORY&gt;");
			return 1;
		}

		if (argc === 0) {
			let home = this.env.vars.HOME;
			if (!home) {
				this.io.eprint("HOME is not set, defaulting to '/'");
				home = "/";
			}

			if (!this.fs.exists(home)) {
				this.io.eprint(`Not a directory: ${home}`);
				return 1;
			}

			this.env.current_dir = home;
			return 0;
		}

		if (!this.fs.exists(argv[0])) {
			this.io.eprint(`Not a directory: ${argv[0]}`);
			return 1;
		}

		this.env.current_dir = this.fs.resolve_path(argv[0]);
		return 0;
	}

	ls(argc: number, argv: string[]): number {
		if (argc <= 0) {
			let files = this.fs.list_dir(this.env.current_dir);
			if (files.__meta_err) {
				this.io.eprint("Error listing dir");
				return 1;
			}
			files = files as { [name: string]: boolean };

			for (const file of Object.keys(files as { [name: string]: boolean })) {
				this.io.print(`${files[file] ? "f" : "d"} ${file}`);
			}
			return 0;
		}

		for (const dir of argv) {
			let files = this.fs.list_dir(dir);
			if (files.__meta_err) {
				this.io.eprint("Error listing dir");
				continue;
			}
			files = files as { [name: string]: boolean };

			this.io.print(dir);
			for (const file of Object.keys(files as { [name: string]: boolean })) {
				this.io.print(`  ${files[file] ? "f" : "d"} ${file}`);
			}
		}

		return 0;
	}

	pwd(argc: number, _argv: string[]): number {
		if (argc > 0) {
			this.io.eprint("Too many arguments");
			this.io.eprint("Usage: pwd");
			return 1;
		}

		this.io.print(this.env.current_dir);
		return 0;
	}

	set(argc: number, argv: string[]): number {
		if (argc < 2 || argc > 3) {
			this.io.eprint("Usage: set &lt;VAR&gt; &lt;VALUE&gt; [OPTIONS]");
			this.io.eprint("OPTIONS:");
			this.io.eprint("  -a | --append: append to existing value");
			return 1;
		}

		const actual_val = this.env.vars[argv[0]];

		if (
			argc === 3 &&
			(argv[2] === "-a" || argv[2] === "--append") &&
			actual_val
		) {
			this.env.vars[argv[0]] = `${actual_val}:${argv[1]}`;

			return 0;
		}

		this.env.vars[argv[0]] = `${argv[1]}`;
		return 0;
	}

	see(argc: number, argv: string[]): number {
		if (argc <= 0) {
			this.io.eprint("Usage: see &lt;VAR(s)&gt;");
			return 1;
		}

		for (const v of argv) {
			this.io.print(`${v}: ${this.env.vars[v]}`);
		}

		return 0;
	}
	alias(argc: number, argv: string[]): number {
		if (
			argc < 1 ||
			(argc !== 2 && argv[argc - 1] !== "-p" && argv[argc - 1] !== "--print")
		) {
			this.io.eprint(
				"Usage: alias &lt;ALIAS&gt; &lt;COMMAND&gt; | &lt;ALIASES&gt; [OPTIONS]",
			);
			this.io.eprint("OPTIONS:\n  -p | --print: print aliases");
			return 1;
		}

		if (argv[argc - 1] === "-p" || argv[argc - 1] === "--print") {
			argv.pop();
			if (argv.length === 0) {
				this.aliases.forEach((cmd, alias) => this.io.print(`${alias}: ${cmd}`));
				return 0;
			}

			for (const alias of argv) {
				const cmd = this.aliases.get(alias);
				if (!cmd) {
					this.io.eprint(`Unknown alias: '${alias}'`);
					continue;
				}
				this.io.print(`${alias}: ${cmd}`);
			}

			return 0;
		}

		this.aliases.set(argv[0], argv[1]);
		return 0;
	}

	mkdir(argc: number, argv: string[]): number {
		if (argc <= 0) {
			this.io.eprint("Usage: mkdir &lt;DIRECTORY(ies)&gt;");
			return 1;
		}

		for (const dir of argv) {
			const err = this.fs.create_dir(dir);
			if (err != null) {
				this.io.eprint(err.msg);
			}
		}

		return 0;
	}

	touch(argc: number, argv: string[]): number {
		if (argc <= 0) {
			this.io.eprint("Usage: touch &lt;FILE(s)&gt;");
			return 1;
		}

		for (const file of argv) {
			const err = this.fs.create_file(file);
			if (err != null) {
				this.io.eprint(err.msg);
			}
		}

		return 0;
	}

	rm(argc: number, argv: string[]): number {
		if (argc <= 0) {
			this.io.eprint("Usage: rm &lt;FILE(s)&gt;");
		}

		for (const file of argv) {
			const err = this.fs.delete(file);
			if (err != null) {
				this.io.eprint(err.msg);
			}
		}

		return 0;
	}

	cat(argc: number, argv: string[]): number {
		if (argc <= 0) {
			this.io.eprint("Usage: cat &lt;FILE(s)&gt;");
			return 1;
		}

		for (const filepath of argv) {
			const file = this.fs.read_file(filepath);
			if (typeof file !== "string") {
				this.io.eprint(file.msg);
				continue;
			}

			this.io.print(file);
		}
		return 0;
	}

	edit(argc: number, argv: string[]): number {
		if (argc <= 0) {
			this.io.eprint("Usage: edit &lt;FILE&gt;");
			return 1;
		}

		if (argc > 1) {
			this.io.eprint("Too many arguments");
			this.io.eprint("Usage: edit &lt;FILE&gt;");
			return 1;
		}

		const file = this.fs.get_file(argv[0]);
		if (!file) {
			this.io.eprint(`File doesn't exists: '${argv[0]}'`);
			return 1;
		}

		this.ed.open(file);

		return 0;
	}

	js(argc: number, argv: string[]): number {
		if (argc <= 0) {
			this.io.eprint("Usage: js &lt;FILE&gt; [ARGS]");
			return 1;
		}

		const source = this.fs.read_file(argv[0]);
		if (typeof source !== "string") {
			this.io.eprint(source.msg);
			return 1;
		}

		argv.shift();
		return this.run(source, argv);
	}

	hist(argc: number, _argv: string[]): number {
		if (argc > 0) {
			this.io.eprint("Too many arguments");
			this.io.eprint("Usage: hist");
			return 1;
		}

		for (const cmd of this.history.cmds) {
			this.io.print(cmd);
		}

		return 0;
	}

	list_builtins(_argc: number, _argv: string[]): number {
		for (const builtin of this.builtins) {
			this.io.print(builtin);
		}

		return 0;
	}

	bf(argc: number, argv: string[]): number {
		const default_stack_size = 3000;

		if (argc < 1) {
			this.io.eprint("Usage: bf &lt;FILE&gt; [STACK_SIZE]");
			return 1;
		}

		const filepath = argv[0];

		if (!this.fs.exists(filepath)) {
			this.io.eprint(`File doesn't exist: '${filepath}'`);
			return 1;
		}

		let stack_size = default_stack_size;
		if (argc >= 2) {
			const parsed_size = Number(argv[1]);
			if (Number.isNaN(parsed_size) || parsed_size <= 0) {
				this.io.eprint("Invalid stack size");
				return 1;
			}
			stack_size = parsed_size;
		}

		const code = this.fs.read_file(filepath);

		if (typeof code !== "string") {
			this.io.eprint("Error reading file");
			return 1;
		}

		const stack = new Uint8Array(stack_size);
		let sp = 0;
		let ip = 0;
		const loop_stack: number[] = [];

		this.io.newline_empty();

		while (ip < code.length) {
			const command = code[ip];

			switch (command) {
				case ">":
					sp = (sp + 1) % stack_size;
					break;
				case "<":
					sp = (sp - 1 + stack_size) % stack_size;
					break;
				case "+":
					stack[sp] = (stack[sp] + 1) & 255;
					break;
				case "-":
					stack[sp] = (stack[sp] === 0 ? 255 : stack[sp] - 1) & 255;
					break;
				case ".":
					this.io.put(String.fromCharCode(stack[sp]));
					break;
				case "[":
					if (stack[sp] === 0) {
						let depth = 1;
						ip++;
						while (ip < code.length) {
							if (code[ip] === "[") depth++;
							if (code[ip] === "]") depth--;
							if (depth === 0) break;
							ip++;
						}
						if (depth !== 0) {
							this.io.eprint("Unmatched '['");
							return 1;
						}
					} else {
						loop_stack.push(ip);
					}
					break;
				case "]":
					if (loop_stack.length === 0) {
						this.io.eprint("Unmatched ']'");
						return 1;
					}
					if (stack[sp] !== 0) {
						ip = loop_stack[loop_stack.length - 1];
					} else {
						loop_stack.pop();
					}
					break;
				default:
					break;
			}
			ip++;
		}

		return 0;
	}
}
