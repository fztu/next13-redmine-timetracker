"use client";

import Link from "next/link";
import { redirect } from 'next/navigation'
import { useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

const LandingPage = () => {
    const { isSignedIn, user, isLoaded } = useUser();

    if (isSignedIn) {
        redirect('/dashboard')
    } else {
        redirect('/sign-in')
    }
}
 
export default LandingPage;