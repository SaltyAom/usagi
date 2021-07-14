export const clone = <T extends Object>(original: T): T =>
	Object.assign(Object.create(Object.getPrototypeOf(original)), original)

export const removeFromArray = <T>(toRemoved: T, array: T[]) => {
	let newArray = [...array]

	newArray.splice(newArray.indexOf(toRemoved), 1)

	return newArray
}
