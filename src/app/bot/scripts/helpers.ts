export function addElementBeforeNth<T>(array: T[], element: T, n: number): T[] {
    if (n < 0 || n > array.length) {
        // If n is out of bounds, return the original array.
        return array;
    }

    // Use the spread operator to create a new array with the element inserted before the nth position.
    const newArray = [...array.slice(0, n), element, ...array.slice(n)];

    return newArray;
}
