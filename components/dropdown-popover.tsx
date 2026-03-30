"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { FormControl } from "@/components/ui/form"

import { cn } from "@/lib/utils"

interface DropdownPopoverProps {
    field: any,
    options: {
        id: string | number,
        name: string
    }[],
    onSelectFunc: (value: string) => void
}

const DropdownPopover = ({
    field,
    options,
    onSelectFunc
}: DropdownPopoverProps) => {
    const [open, setOpen] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null);

    return (
        <div ref={containerRef} className="w-full col-span-4">
            <FormControl className="items-end col-span-4 w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className={cn(
                                "justify-between h-fit w-full",
                                !field.value && "text-muted-foreground"
                            )}
                        >
                            {field.value
                                ? options?.find(
                                    (option) => option?.id.toString() === field.value
                                )?.name
                                : "Select an option"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="p-0 col-span-4 w-full"
                    style={{
                        width: containerRef.current?.offsetWidth
                    }}
                    container={containerRef.current}
                >
                    <Command>
                        <CommandInput placeholder="Search options..." />
                        <CommandList className="max-h-[200px] overflow-y-auto">
                            <CommandEmpty>No option found.</CommandEmpty>
                            <CommandGroup>
                                {options?.map((option) => (
                                    <CommandItem
                                        value={option.name}
                                        key={option.id}
                                        onSelect={(currentValue) => {
                                            onSelectFunc(currentValue.toLowerCase());
                                            setOpen(false)
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                option?.id.toString() === field.value
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        {option.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            </FormControl>
        </div>
    );
}

export default DropdownPopover;