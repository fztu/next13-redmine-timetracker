"use client";

import axios from 'axios'
import useSWR from 'swr'
import { useUser } from "@clerk/nextjs";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import RedmineConnectionForm from "@/components/redmine-connection-form";
import { UserRedmineConnection } from '@prisma/client';

const fetcher = (url: string) => axios.get(url).then(res => res.data)

const ConnectionsPage = () => {
  const { isSignedIn, user, isLoaded } = useUser();
  const { data: redmineConnections, isLoading, isValidating, error } = useSWR(
    '/api/redmine/conn?userId=' + user?.id ?? "",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    }
  );

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
    <div className="items-start justify-center gap-2 rounded-lg p-2 md:grid lg:grid-cols-2 xl:grid-cols-3">
      {redmineConnections?.map((userRedmineConnection: UserRedmineConnection) => (
        <Card key={userRedmineConnection.id}>
          <CardHeader className="p-4">
            <CardTitle>{userRedmineConnection?.name ?? "Redmine Connection"}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <RedmineConnectionForm
              userRedmineConnection={userRedmineConnection}
            />
          </CardContent>
        </Card>
      ))
      }
      <Card key="new-redmine-connection" className="bg-slate-100">
        <CardHeader className="p-4">
          <CardTitle>Connect to new Redmine account</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <RedmineConnectionForm />
        </CardContent>
      </Card>
    </div>
  )
}

export default ConnectionsPage;