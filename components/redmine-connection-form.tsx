"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios";
import { useSWRConfig } from 'swr'
import { useRouter } from "next/navigation";

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
    apikey: z.string().nonempty({
        message: "API Key is required."
    })
});

interface RedmineConnectionFormProps {
    userRedmineConnection?: UserRedmineConnection
}

const RedmineConnectionForm = ({
    userRedmineConnection
}: RedmineConnectionFormProps) => {
    const router = useRouter();
    const { mutate } = useSWRConfig()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState<boolean>(false)

    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: userRedmineConnection?.id ?? "",
            name: userRedmineConnection?.name ?? "",
            url: userRedmineConnection?.url ?? "",
            apikey: userRedmineConnection?.apiKey ?? ""
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
            router.refresh()
            // tell all SWRs with this key to revalidate
            mutate('/api/redmine/conn')
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
            router.refresh()
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
            router.refresh()
            // tell all SWRs with this key to revalidate
            mutate('/api/redmine/conn')
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                <Input placeholder="Connection 123" {...field} />
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
                                <Input placeholder="https://redmine.silksoftware.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
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
                                <FormDescription className="text-red-700 italic">
                                    This can be found from My Account page after you login your Redmine account.
                                </FormDescription>
                            }
                        </FormItem>
                    )}
                />
                <section className="w-full flex flex-row space-x-6">
                    {userRedmineConnection?.id &&
                        <AlertDialog>
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
                {userRedmineConnection?.id &&
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">Name:</p>
                            </div>
                            <div className="ml-auto font-medium">{userRedmineConnection?.firstname} {userRedmineConnection?.lastname}</div>
                        </div>
                        <div className="flex items-center">
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">Login:</p>
                            </div>
                            <div className="ml-auto font-medium">{userRedmineConnection?.username}</div>
                        </div>
                        <div className="flex items-center">
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">Email:</p>
                            </div>
                            <div className="ml-auto font-medium">{userRedmineConnection?.redmineEmail}</div>
                        </div>
                    </div>
                }
            </form>
        </Form>
    );
}

export default RedmineConnectionForm;