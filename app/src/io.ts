export class IO {
	output: HTMLElement;
	input: HTMLInputElement;
	private __input_listener: (event: KeyboardEvent) => void = (_) => {};

	constructor(output: HTMLElement, input: HTMLInputElement) {
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

	// @ts-ignore
	put(char): void {
		if (char === "\n") {
			this.newline_empty();
			return;
		}

		if (!this.output.lastChild) {
			this.newline();
		}
		// @ts-ignore
		this.output.lastChild.innerHTML += `${char}`;
	}

	clear() {
		this.output.innerHTML = "";
	}

	newline() {
		this.output.innerHTML += `<div class="line"><pre> </pre></div>`;
	}
	newline_empty() {
		this.output.innerHTML += `<div class="line"></div>`;
	}
}
