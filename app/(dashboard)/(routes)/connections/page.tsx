"use client";

import { useState, useEffect } from 'react'
import axios from 'axios'
import useSWR from 'swr'

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
import { UserRedmineConnection } from '@prisma/client';

const fetcher = (url: string) => axios.get(url).then(res => res.data)

const ConnectionsPage = () => {
  const { data: redmineConnections, isLoading, isValidating, error } = useSWR(
    '/api/redmine/conn',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    }
  );
  console.log(redmineConnections);
  console.log(error);

  // If it's still loading the initial data, there is nothing to display.
  // We return a skeleton here.
  if (isLoading) {
    return (
      <div className="border border-blue-300 shadow rounded-md p-4 max-w-sm w-full mx-auto">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-slate-200 h-10 w-10"></div>
          <div className="flex-1 space-y-6 py-1">
            <div className="h-2 bg-slate-200 rounded"></div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                <div className="h-2 bg-slate-200 rounded col-span-1"></div>
              </div>
              <div className="h-2 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="hidden items-start justify-center gap-2 rounded-lg p-2 md:grid lg:grid-cols-2 xl:grid-cols-3">
      {redmineConnections?.map((userRedmineConnection: UserRedmineConnection) => (
        <Card className="bg-green-300">
          <CardHeader>
            <CardTitle>{userRedmineConnection?.name ?? "Redmine Connection"}</CardTitle>
          </CardHeader>
          <CardContent>
            <RedmineConnectionForm
              userRedmineConnection={userRedmineConnection}
            />
          </CardContent>
        </Card>
      ))
      }
      <Card className="bg-blue-100">
        <CardHeader>
          <CardTitle>Connect to new Redmine account</CardTitle>
        </CardHeader>
        <CardContent>
          <RedmineConnectionForm />
        </CardContent>
      </Card>
    </div>
  )
}

export default ConnectionsPage;