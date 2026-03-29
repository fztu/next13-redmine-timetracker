// app/providers.js
'use client'
import { useEffect, useState } from 'react'
import posthog from 'posthog-js'

let PostHogProvider: React.ComponentType<any> | null = null

try {
  const posthogReact = require('posthog-js/react')
  PostHogProvider = posthogReact.PostHogProvider
} catch (e) {
  console.warn('PostHog React provider failed to load:', e)
}

export function CSPostHogProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      try {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        })
      } catch (e) {
        console.warn('PostHog initialization failed:', e)
      }
    }
    setIsReady(true)
  }, [])

  if (!isReady) {
    return <>{children}</>
  }

  if (PostHogProvider) {
    return <PostHogProvider client={posthog}>{children}</PostHogProvider>
  }

  return <>{children}</>
}