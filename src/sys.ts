export type Env = {
	current_dir: string;
	vars: { [key: string]: string };
};

export interface Err {
	msg: string;
	__meta_err: true;
}
