/**
 * Example usage
 * ---------------
 *
 * Do
 * interface Data {
 *    readonly name: string;
 * }
 *
 * Use
 * ---------------
 * type RequiredMutableData = RequiredMutable<Data>;
 *
 * Result
 * ---------------
 * type RequiredMutableData = {
 *    name: string;
 * }
 *
 */
type RequiredMutable<T> = {
  -readonly [P in keyof T]-?: NonNullable<T[P]>;
};

export default RequiredMutable;
