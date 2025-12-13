import React from 'react'
import LoginUI from "@/module/auth/components/Login-ui";
import {requireUnauth} from "@/module/auth/utils/auth-utils";

const LoginPage = async () => {
    await requireUnauth()
    return (
        <div className="dark">
            <LoginUI/>
        </div>

    )
}
export default LoginPage
