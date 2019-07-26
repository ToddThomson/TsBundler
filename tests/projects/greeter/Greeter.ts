import * as ts from "typescript"
import { Hello } from "./hello"
import { Hello as Hello_1 } from "./hello"
import { Hello as HelloTest } from "./test/hello"

export class Greeter
{
    public SayHello()
    {
        let hello = new Hello();
        let hello_1 = new Hello_1();
        let helloTest = new HelloTest();

        return hello.sayHi() + hello_1.sayHi() + helloTest.sayHiThere() +
            " from the Greeter class " +
            this.typescriptVersion
    }

    private typescriptVersion(): string {
        return ts.versionMajorMinor;
    }
}