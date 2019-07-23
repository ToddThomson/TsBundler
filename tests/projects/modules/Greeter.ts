import * as ts from "typescript"
import { Hello } from "./hello"
import { Hello as Hi } from "./hello"

export class Greeter
{
    public SayHello()
    {
        let hello = new Hello();
        let anotherHello = new Hi();

        return hello.sayHi() + anotherHello.sayHi() +
            " from the Greeter class " +
            this.typescriptVersion
    }

    private typescriptVersion(): string {
        return ts.versionMajorMinor;
    }
}