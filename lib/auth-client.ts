import {createAuthClient} from "better-auth/react";
import {polarClient} from "@polar-sh/better-auth";

export const {signIn, signUp, useSession, signOut, customer, checkout} = createAuthClient({
    baseURL: "https://www.codebaba.in",
    plugins:[polarClient()]
})
