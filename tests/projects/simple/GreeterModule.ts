import * as ts from "typescript"
import { Hello } from "./hello"

export class Greeter {
    public SayHello() {
        const hello = new Hello();
        return hello.sayHi() + " from the Greeter class " + this.typescriptVersion;
    }

    private typescriptVersion(): string {
        return ts.versionMajorMinor;
    }
}