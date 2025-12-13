import React from 'react'
import Logout from "@/module/auth/components/Logout";
import {Button} from "@/components/ui/button";
import {requireAuth} from "@/module/auth/utils/auth-utils";

const Dashboard = () => {
    return (
        <Logout>
            <Button>
                Logout
            </Button>
        </Logout>
    )
}
export default Dashboard
