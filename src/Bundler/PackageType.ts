/**
 * Bundle package types.
 */
export enum PackageType {
    /** Default. No special processing. */
    None = 0,

    /** Wraps the bundle in an exported namespace with the bundle name.  */
    Library = 1,

    /** For removing module export modifier. */
    Component = 2
}