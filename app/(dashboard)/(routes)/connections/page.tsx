"use client";

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import RedmineConnectionForm from "@/components/redmine-connection-form";

const ConnectionsPage = () => {  
  return (
    <Card className="w-[450px] m-5">
      <CardHeader>
        <CardTitle>Connect to new Redmine account</CardTitle>
      </CardHeader>
      <CardContent>
        <RedmineConnectionForm />
      </CardContent>
    </Card>
  )
}

export default ConnectionsPage;