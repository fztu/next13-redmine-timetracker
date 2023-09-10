"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios";
import { useRouter } from "next/navigation";

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

const formSchema = z.object({
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

const RedmineConnectionForm = () => {
    const router = useRouter();
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState<boolean>(false)

    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            url: "",
            apikey: ""
        },
    })

    // 2. Define a submit handler.
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            console.log("Connect and save Redmine Connection");
            console.log(values);
            setIsLoading(true);
            const response = await axios.post(
                '/api/redmine/saveconn',
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
        }
    }

    // Define a Test Connection handler.
    const onTestConnection = async (values: z.infer<typeof formSchema>) => {
        try {
            console.log("Test Connection");
            console.log(values);
            setIsLoading(true);
            const response = await axios.post(
                '/api/redmine/testconn',
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

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                        </FormItem>
                    )}
                />
                <section className="w-full flex flex-row space-x-6">
                    <Button
                        variant="outline"
                        type="button"
                        className="w-1/2"
                        disabled={isLoading}
                        onClick={form.handleSubmit(onTestConnection)}
                    >
                        Test Connection
                    </Button>
                    <Button
                        variant="default"
                        type="submit"
                        className="w-1/2"
                        disabled={isLoading}
                    >
                        Connect and Save
                    </Button>
                </section>
            </form>
        </Form>
    );
}

export default RedmineConnectionForm;