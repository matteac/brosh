import "./style.css";

import { FileSys } from "./fs.ts";
import type { Env } from "./sys.ts";
import { Shell } from "./sh.ts";
import { IO } from "./io.ts";
import { Editor } from "./ed.ts";

const PROMPT = "$";

const terminal = document.querySelector("#terminal") as HTMLElement;
const output = document.querySelector("#output") as HTMLElement;
const input = document.querySelector("#input") as HTMLElement;
const input_prompt = document.querySelector("#prompt") as HTMLElement;

const editor_dialog = document.querySelector("#editor") as HTMLDialogElement;
const editor_input = document.querySelector(
	"#editor-input",
) as HTMLTextAreaElement;
const save_btn = document.querySelector("#save-button") as HTMLButtonElement;

const env: Env = { current_dir: "/", vars: { PATH: "/bin" } };
const io = new IO(output, input);
const fs = new FileSys(env);
const ed = new Editor(editor_dialog, editor_input, save_btn);
const sh = new Shell(fs, io, ed, env);

input_prompt.innerHTML = `${env.current_dir} ${PROMPT} `;

io.set_input_listener((event: KeyboardEvent) => {
	const target = event.target as HTMLInputElement;

	switch (event.key) {
		case "ArrowUp":
			{
				const cmd = sh.get_prev_cmd();
				if (!cmd) {
					return;
				}
				target.value = cmd;
				setTimeout(() => {
					target.focus();
					target.setSelectionRange(cmd.length, cmd.length);
				}, 1);
			}
			break;
		case "ArrowDown":
			{
				const cmd = sh.get_next_cmd();
				target.value = cmd;
				setTimeout(() => {
					target.focus();
					target.setSelectionRange(cmd.length, cmd.length);
				}, 1);
			}
			break;
		case "Enter":
			{
				const src = target.value;
				target.value = "";

				io.prompt_print(src, PROMPT, env.current_dir);

				sh.exec(src);
				output.scrollTo(0, output.scrollHeight);
				terminal.scrollTo(0, terminal.scrollHeight + 100);

				input_prompt.innerHTML = `${env.current_dir} ${PROMPT} `;
			}
			break;
	}
});

io.print("Welcome to Brosh!");
io.print("Type 'builtins' to see a list of available commands.");
io.newline();
io.print(
	"> To make a custom command create a file in your path and return the main function",
);
io.print("> You can access the shell context with 'this'");
io.print("> See /bin/example");
