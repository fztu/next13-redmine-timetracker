"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios";
import { useSWRConfig } from 'swr'
import { useUser } from "@clerk/nextjs";

import type { UserRedmineConnection } from '@prisma/client'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";

import type { 
    ProjectResponse,
    Project as RedmineProject
} from "@/lib/redmine"

const formSchema = z.object({
    id: z.string(),
    name: z.string().min(2, {
        message: "Connection Name must be at least 2 characters.",
    }),
    url: z.string().nonempty({
        message: "Redmine URL is required."
    }).url({
        message: "Invalid url"
    }),
    username: z.string().nonempty({
        message: "Username is required."
    }),
    password: z.string().optional()
    // apikey: z.string().nonempty({
    //     message: "API Key is required."
    // })
});

interface RedmineConnectionFormProps {
    userRedmineConnection?: UserRedmineConnection
}

const RedmineConnectionForm = ({
    userRedmineConnection
}: RedmineConnectionFormProps) => {
    const { mutate } = useSWRConfig()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [open, setOpen] = useState<boolean>(false);
    const { isSignedIn, user, isLoaded } = useUser();

    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: userRedmineConnection?.id ?? "",
            name: userRedmineConnection?.name ?? "",
            url: userRedmineConnection?.url ?? "",
            username: userRedmineConnection?.username ?? "",
            // password: "******"
            // apikey: userRedmineConnection?.apiKey ?? ""
        },
    })

    // 2. Define a submit handler.
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            console.log("Connect and save Redmine Connection");
            console.log(values);
            setIsLoading(true);
            const response = await axios.post(
                '/api/redmine/conn/save',
                values
            );
            console.log(response.data);
            if (response?.data?.status?.hasError === false) {
                toast({
                    title: "Connection Saved",
                    description: "Redmine connection tested and saved successfully.",
                });
                form.reset();
            } else {
                toast({
                    variant: "destructive",
                    title: "Failed",
                    description: "Failed to connect to Redmine and save",
                })
            }

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Failed",
                description: "Something went wrong",
            });
            console.log(error);
        } finally {
            setIsLoading(false);
            // tell all SWRs with this key to revalidate
            mutate('/api/redmine/conn?userId=' + user?.id ?? "")
        }
    }

    // Define a Test Connection handler.
    const onTestConnection = async (values: z.infer<typeof formSchema>) => {
        try {
            console.log("Test Connection");
            console.log(values);
            setIsLoading(true);
            const response = await axios.post(
                '/api/redmine/conn/test',
                values
            );
            console.log(response.data);
            if (response?.data?.status?.hasError === false) {
                toast({
                    title: "Test Connection Sucess",
                    description: "Redmine connection tested successfully.",
                })
            } else {
                toast({
                    variant: "destructive",
                    title: "Test Connection Failed",
                    description: "Failed to connect to Redmine",
                })
            }

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Test Connection Failed",
                description: "Something went wrong",
            });
            console.log(error);
        } finally {
            setIsLoading(false);
        }
    }

    // Define a Delete Connection handler.
    const onDeleteConnection = async (values: z.infer<typeof formSchema>) => {
        try {
            console.log("Delete Redmine Connection");
            console.log(values);
            setIsLoading(true);
            const response = await axios.delete(
                `/api/redmine/conn/${values.id}`
            );
            console.log(response.data);
            if (response?.data?.status?.hasError === false) {
                toast({
                    title: "Connection Deleted",
                    description: "Redmine connection deleted successfully.",
                });
                form.reset();
            } else {
                toast({
                    variant: "destructive",
                    title: "Failed",
                    description: "Failed to delete the Redmine connection",
                })
            }

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Failed",
                description: "Something went wrong",
            });
            console.log(error);
        } finally {
            setIsLoading(false);
            // tell all SWRs with this key to revalidate
            mutate('/api/redmine/conn?userId=' + user?.id ?? "")
        }
    }

    // Define a Test Connection handler.
    // vercel has 5s API execution time limit
    // updat code to retrieve projects page by page, then post to save
    const onRefreshProjects = async (values: z.infer<typeof formSchema>) => {
        try {
            console.log("Refresh projects");
            // console.log(values);
            setIsLoading(true);
            let offset = 0
            let limit = 100
            let params = {
                "offset": offset.toString(),
                "limit": limit.toString()
            }
        
            let usp = new URLSearchParams(params);
            usp.sort();
            let qs = usp.toString();
            let allProjects: RedmineProject[] = []
            let level1Projects: RedmineProject[] = [];
            // let level2Projects: RedmineProject[] = [];
            let projectsResponse = await axios.get(
                `/api/redmine/conn/${values.id}/projectsperpage?${qs}`
            );
            // console.log(projectsResponse.data.data);
            // console.log(typeof projectsResponse.data.data);
            // console.log(projectsResponse.data.data.length);
            let projects: RedmineProject[] = projectsResponse.data.data;
            if (projects && projects.length > 0) {
                allProjects = [...projects]
                while (projects.length > 0) {
                    offset += limit
                    params = {
                        "offset": offset.toString(),
                        "limit": limit.toString()
                    }
                    usp = new URLSearchParams(params);
                    usp.sort();
                    qs = usp.toString();
                    projectsResponse = await axios.get(
                        `/api/redmine/conn/${values.id}/projectsperpage?${qs}`
                    );
                    projects = projectsResponse.data.data;
                    if (projects && projects.length > 0) {
                        allProjects = [...allProjects, ...projects]
                    } else {
                        break;
                    }
                }
            }

            if (allProjects.length > 0) {
                let activeProjects = allProjects.filter(p => p.status == 1);
                activeProjects.forEach((p, idx) => {
                    // console.log(p);
                    if (p.parent?.id) {
                    } else {
                        let children = activeProjects.filter(obj => {
                            return obj?.parent?.id == p.id
                        });
                        p.children = children;
                        level1Projects.push(p);
                    }
                });
            }
            // console.log(level1Projects);

            const response = await axios.post(
                `/api/redmine/conn/${values.id}/projects/cache`,
                {"projects": JSON.stringify(level1Projects)}
            );
            console.log(response.data);
            if (response?.data?.success) {
                toast({
                    title: "Projects Refreshed Sucess",
                    description: "Redmine projects refreshed successfully.",
                })
            } else {
                toast({
                    variant: "destructive",
                    title: "Failed to refresh projects",
                    description: "Failed to refresh projects",
                })
            }

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Failed to refresh projects",
                description: "Something went wrong",
            });
            console.log(error);
        } finally {
            setIsLoading(false);
            // tell all SWRs with this key to revalidate
            mutate('/api/redmine/conn?userId=' + user?.id ?? "")
            setOpen(false)
        }
    }

    return (
        <Form {...form}>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {userRedmineConnection?.id &&
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">Name:</p>
                            </div>
                            <div className="ml-auto font-medium">{userRedmineConnection?.firstname} {userRedmineConnection?.lastname}</div>
                        </div>
                        {/* <div className="flex items-center">
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">Login:</p>
                            </div>
                            <div className="ml-auto font-medium">{userRedmineConnection?.username}</div>
                        </div> */}
                        <div className="flex items-center">
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">Email:</p>
                            </div>
                            <div className="ml-auto font-medium">{userRedmineConnection?.redmineEmail}</div>
                        </div>
                        <div className="flex items-center">
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">Assigned Projects:</p>
                            </div>
                            <div className="ml-auto pr-8 font-bold">{
                                userRedmineConnection?.projects ?
                                    JSON.parse(userRedmineConnection?.projects).length :
                                    0
                            }</div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="default"
                                            type="button"
                                            className="w-1/8"
                                            disabled={isLoading}
                                            onClick={form.handleSubmit(onRefreshProjects)}
                                        >
                                            Refresh Projects
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>It can take 1-2 mins depends on <br /> how many projects you are assigned.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                }
                <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                        <FormItem className="hidden">
                            <FormLabel>ID</FormLabel>
                            <FormControl>
                                <Input className="bg-gray-300" readOnly {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Connection Name</FormLabel>
                            <FormControl>
                                <Input 
                                    // readOnly={userRedmineConnection?.id ? true : false} 
                                    // className={userRedmineConnection?.id ? "bg-gray-50" : ""}
                                    placeholder="Connection 123" {...field} 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Redmine URL</FormLabel>
                            <FormControl>
                                <Input 
                                    readOnly={userRedmineConnection?.id ? true : false} 
                                    className={userRedmineConnection?.id ? "bg-gray-50" : ""}
                                    placeholder="https://redmine.silksoftware.com" {...field} 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                                <Input 
                                    readOnly={userRedmineConnection?.id ? true : false} 
                                    className={userRedmineConnection?.id ? "bg-gray-50" : ""}
                                    type="text" 
                                    placeholder="" {...field} 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="******" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {/* <FormField
                    control={form.control}
                    name="apikey"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl>
                                <Input type="text" placeholder="xyz123fdfdafdsfd" {...field} />
                            </FormControl>
                            <FormMessage />
                            {!userRedmineConnection?.id &&
                                <FormDescription className="text-violet-900 italic text-xs">
                                    This can be found from My Account page after you login your Redmine account.
                                </FormDescription>
                            }
                        </FormItem>
                    )}
                /> */}
                <section className="w-full flex flex-row space-x-6">
                    {userRedmineConnection?.id &&
                        <AlertDialog open={open} onOpenChange={setOpen} >
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={isLoading}>Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone.
                                        This will permanently delete your connection from our servers.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={form.handleSubmit(onDeleteConnection)}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    }
                    <Button
                        variant="outline"
                        type="button"
                        className="w-1/2"
                        disabled={isLoading}
                        onClick={form.handleSubmit(onTestConnection)}
                    >
                        Test
                    </Button>
                    <Button
                        variant="default"
                        type="submit"
                        className="w-1/2"
                        disabled={isLoading}
                    >
                        Save
                    </Button>
                </section>
            </form>
        </Form>
    );
}

export default RedmineConnectionForm;