export const clone = <T extends Object>(original: T): T =>
	Object.assign(Object.create(Object.getPrototypeOf(original)), original)
