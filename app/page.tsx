import Image from "next/image";
import {Button} from "@/components/ui/button";
import {requireUnauth} from "@/module/auth/utils/auth-utils";

export default async function Home() {
    await requireUnauth()
    return (

    <Button>Hello</Button>
      );
}
