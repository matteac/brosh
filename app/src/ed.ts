import type { File } from "./fs";

export class Editor {
	dialog: HTMLDialogElement;
	input: HTMLTextAreaElement;
	save_btn: HTMLButtonElement;
	file: File | null;

	constructor(
		dialog: HTMLDialogElement,
		input: HTMLTextAreaElement,
		save_btn: HTMLButtonElement,
	) {
		this.dialog = dialog;
		this.input = input;
		this.save_btn = save_btn;
		this.file = null;

		this.save_btn.addEventListener("click", () => {
			this.save();
		});
		this.dialog.addEventListener("close", () => {
			this.close();
		});
		this.dialog.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				e.preventDefault();
				return;
			}
		});
	}

	open(file: File) {
		this.file = file;
		this.input.value = file.content || "";
		this.dialog.showModal();
	}

	save() {
		if (!this.file) {
			alert("No file open");
			return;
		}
		this.file.content = this.input.value;
	}

	close() {
		this.input.value = "";
		this.file = null;
	}
}
