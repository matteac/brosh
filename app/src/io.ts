export class IO {
	output: HTMLElement;
	input: HTMLElement;
	private __input_listener: (event: KeyboardEvent) => void = (_) => {};

	constructor(output: HTMLElement, input: HTMLElement) {
		this.output = output;
		this.input = input;
	}

	set_input_listener(listener: (event: KeyboardEvent) => void) {
		this.input.removeEventListener("keydown", this.__input_listener);

		this.__input_listener = listener;
		this.input.addEventListener("keydown", this.__input_listener);
	}

	// @ts-ignore
	prompt_print(data, prompt: string, path = ""): void {
		const str = `${data}`;
		for (const line of str.split("\n")) {
			this.output.innerHTML += `<div class="line"><span class="prompt">${path} ${prompt}</span><pre> ${line}</pre></div>`;
		}
	}
	// @ts-ignore
	print(data): void {
		const str = `${data}`;
		for (const line of str.split("\n")) {
			if (line === "") this.newline();
			this.output.innerHTML += `<div class="line"><pre>${line}</pre></div>`;
		}
	}

	// @ts-ignore
	eprint(data): void {
		const str = `${data}`;
		for (const line of str.split("\n")) {
			if (line === "") this.newline();
			this.output.innerHTML += `<div class="error line"><pre>${line}</pre></div>`;
		}
	}

	clear() {
		this.output.innerHTML = "";
	}

	newline() {
		this.output.innerHTML += `<div class="line"><pre> </pre></div>`;
	}
}
